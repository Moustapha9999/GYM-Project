"""Service métier — gestion des utilisateurs."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.models.role import Role
from app.models.utilisateur import Utilisateur
from app.schemas.utilisateur import UtilisateurCreate, UtilisateurUpdate

ROLES_ASSIGNABLES = {"receptionniste", "coach", "pdg"}
ROLES_NON_SUPPRIMABLES = {"super_admin"}


def lister(db: Session) -> list[Utilisateur]:
    return (
        db.query(Utilisateur)
        .options(joinedload(Utilisateur.role))
        .order_by(Utilisateur.created_at.desc())
        .all()
    )


def obtenir(db: Session, utilisateur_id: uuid.UUID) -> Utilisateur | None:
    return (
        db.query(Utilisateur)
        .options(joinedload(Utilisateur.role))
        .filter(Utilisateur.id == utilisateur_id)
        .first()
    )


def creer(db: Session, payload: UtilisateurCreate) -> Utilisateur:
    if payload.role_nom not in ROLES_ASSIGNABLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Rôle non autorisé pour la création : {payload.role_nom}",
        )

    role = db.query(Role).filter(Role.nom == payload.role_nom).first()
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Rôle introuvable : {payload.role_nom}",
        )

    existant = db.query(Utilisateur).filter(Utilisateur.email == payload.email).first()
    if existant:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Cet email est déjà utilisé.",
        )

    utilisateur = Utilisateur(
        role_id=role.id,
        nom=payload.nom.strip(),
        prenom=payload.prenom.strip(),
        email=payload.email.lower().strip(),
        telephone=payload.telephone,
        password_hash=hash_password(payload.password),
        actif=True,
    )
    db.add(utilisateur)
    db.commit()
    db.refresh(utilisateur)

    return (
        db.query(Utilisateur)
        .options(joinedload(Utilisateur.role))
        .filter(Utilisateur.id == utilisateur.id)
        .first()
    )


def modifier(
    db: Session, utilisateur: Utilisateur, payload: UtilisateurUpdate
) -> Utilisateur:
    if utilisateur.role and utilisateur.role.nom in ROLES_NON_SUPPRIMABLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ce compte système ne peut pas être modifié.",
        )

    data = payload.model_dump(exclude_unset=True)

    if "role_nom" in data:
        role_nom = data.pop("role_nom")
        if role_nom not in ROLES_ASSIGNABLES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Rôle non autorisé : {role_nom}",
            )
        role = db.query(Role).filter(Role.nom == role_nom).first()
        if role is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Rôle introuvable : {role_nom}",
            )
        utilisateur.role_id = role.id

    if "email" in data:
        email = data["email"].lower().strip()
        existant = (
            db.query(Utilisateur)
            .filter(Utilisateur.email == email, Utilisateur.id != utilisateur.id)
            .first()
        )
        if existant:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Cet email est déjà utilisé.",
            )
        utilisateur.email = email
        del data["email"]

    if "password" in data:
        utilisateur.password_hash = hash_password(data.pop("password"))

    for champ, valeur in data.items():
        if champ in {"nom", "prenom"} and isinstance(valeur, str):
            setattr(utilisateur, champ, valeur.strip())
        else:
            setattr(utilisateur, champ, valeur)

    db.commit()
    db.refresh(utilisateur)

    return (
        db.query(Utilisateur)
        .options(joinedload(Utilisateur.role))
        .filter(Utilisateur.id == utilisateur.id)
        .first()
    )


def desactiver(db: Session, utilisateur: Utilisateur) -> None:
    if utilisateur.role and utilisateur.role.nom in ROLES_NON_SUPPRIMABLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Ce compte système ne peut pas être désactivé.",
        )
    utilisateur.actif = False
    db.commit()


def lister_roles(db: Session) -> list[Role]:
    return db.query(Role).order_by(Role.libelle).all()
