"""Service métier des Employés."""
import secrets
import uuid

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.fonction_roles import fonction_vers_role
from app.core.security import hash_password
from app.models.employe import Employe
from app.models.role import Role
from app.models.utilisateur import Utilisateur
from app.schemas.rh import EmployeCompteUtilisateur, EmployeRead


def lister(db: Session, search: str | None = None, statut: str | None = None, fonction: str | None = None):
    query = db.query(Employe).options(
        joinedload(Employe.utilisateur).joinedload(Utilisateur.role)
    )
    if search:
        terme = f"%{search}%"
        query = query.filter(or_(Employe.nom.ilike(terme), Employe.prenom.ilike(terme)))
    if statut:
        query = query.filter(Employe.statut == statut)
    if fonction:
        query = query.filter(Employe.fonction == fonction)
    return query.order_by(Employe.created_at.desc())


def obtenir(db: Session, employe_id: uuid.UUID) -> Employe | None:
    return (
        db.query(Employe)
        .options(joinedload(Employe.utilisateur).joinedload(Utilisateur.role))
        .filter(Employe.id == employe_id)
        .first()
    )


def _charger_utilisateur(db: Session, utilisateur_id: uuid.UUID) -> Utilisateur | None:
    return (
        db.query(Utilisateur)
        .options(joinedload(Utilisateur.role))
        .filter(Utilisateur.id == utilisateur_id)
        .first()
    )


def _role_associe(db: Session, fonction: str) -> Role | None:
    role_nom = fonction_vers_role(fonction)
    if role_nom is None:
        return None
    return db.query(Role).filter(Role.nom == role_nom).first()


def _verifier_email_disponible(db: Session, email: str, utilisateur_id: uuid.UUID | None = None) -> None:
    query = db.query(Utilisateur).filter(Utilisateur.email == email)
    if utilisateur_id is not None:
        query = query.filter(Utilisateur.id != utilisateur_id)
    if query.first():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cet email est déjà utilisé par un autre compte.",
        )


def _provisionner_compte_utilisateur(db: Session, employe: Employe) -> Utilisateur | None:
    role = _role_associe(db, employe.fonction)
    if role is None:
        return None

    if not employe.email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Un email est requis pour les fonctions associées à un rôle système.",
        )

    email = employe.email.lower().strip()
    _verifier_email_disponible(db, email, employe.utilisateur_id)

    utilisateur = Utilisateur(
        role_id=role.id,
        nom=employe.nom.strip(),
        prenom=employe.prenom.strip(),
        email=email,
        telephone=employe.telephone,
        password_hash=hash_password(secrets.token_urlsafe(32)),
        actif=False,
    )
    db.add(utilisateur)
    db.flush()
    employe.utilisateur_id = utilisateur.id
    return utilisateur


def _synchroniser_compte_utilisateur(db: Session, employe: Employe) -> None:
    role = _role_associe(db, employe.fonction)

    if employe.utilisateur_id:
        utilisateur = _charger_utilisateur(db, employe.utilisateur_id)
        if utilisateur is None:
            employe.utilisateur_id = None
        else:
            utilisateur.nom = employe.nom.strip()
            utilisateur.prenom = employe.prenom.strip()
            utilisateur.telephone = employe.telephone

            if role is not None:
                utilisateur.role_id = role.id
                if employe.email:
                    email = employe.email.lower().strip()
                    _verifier_email_disponible(db, email, utilisateur.id)
                    utilisateur.email = email
            return

    if role is not None:
        _provisionner_compte_utilisateur(db, employe)


def to_read(db: Session, employe: Employe) -> EmployeRead:
    role = _role_associe(db, employe.fonction)
    compte = None
    utilisateur = employe.utilisateur

    if utilisateur is None and employe.utilisateur_id:
        utilisateur = _charger_utilisateur(db, employe.utilisateur_id)

    if utilisateur and utilisateur.role:
        compte = EmployeCompteUtilisateur(
            id=utilisateur.id,
            email=utilisateur.email,
            actif=utilisateur.actif,
            role_nom=utilisateur.role.nom,
            role_libelle=utilisateur.role.libelle,
        )

    return EmployeRead(
        id=employe.id,
        nom=employe.nom,
        prenom=employe.prenom,
        fonction=employe.fonction,
        telephone=employe.telephone,
        email=employe.email,
        adresse=employe.adresse,
        date_embauche=employe.date_embauche,
        type_contrat=employe.type_contrat,
        salaire_base=employe.salaire_base,
        statut=employe.statut,
        created_at=employe.created_at,
        utilisateur_id=employe.utilisateur_id,
        role_associe=role.libelle if role else None,
        compte_utilisateur=compte,
    )


def creer(db: Session, data) -> Employe:
    employe = Employe(**data.model_dump())
    db.add(employe)
    db.flush()
    _provisionner_compte_utilisateur(db, employe)
    db.commit()
    db.refresh(employe)
    return obtenir(db, employe.id) or employe


def modifier(db: Session, employe: Employe, data) -> Employe:
    for champ, valeur in data.model_dump(exclude_unset=True).items():
        setattr(employe, champ, valeur)
    db.flush()
    _synchroniser_compte_utilisateur(db, employe)
    db.commit()
    return obtenir(db, employe.id) or employe


def supprimer(db: Session, employe: Employe) -> None:
    if employe.utilisateur_id:
        utilisateur = _charger_utilisateur(db, employe.utilisateur_id)
        if utilisateur and utilisateur.actif:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Désactivez d'abord le compte utilisateur lié avant de supprimer l'employé.",
            )
        if utilisateur:
            db.delete(utilisateur)

    db.delete(employe)
    db.commit()
