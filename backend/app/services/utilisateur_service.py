"""Service métier — gestion des utilisateurs."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import hash_password
from app.models.role import Role
from app.models.utilisateur import Utilisateur
from app.schemas.utilisateur import UtilisateurCreate

ROLES_CREATABLE_BY_ADMIN = {"receptionniste", "coach"}


def lister(db: Session) -> list[Utilisateur]:
    return (
        db.query(Utilisateur)
        .options(joinedload(Utilisateur.role))
        .order_by(Utilisateur.created_at.desc())
        .all()
    )


def creer(db: Session, payload: UtilisateurCreate) -> Utilisateur:
    if payload.role_nom not in ROLES_CREATABLE_BY_ADMIN:
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


def lister_roles(db: Session) -> list[Role]:
    return db.query(Role).order_by(Role.libelle).all()
