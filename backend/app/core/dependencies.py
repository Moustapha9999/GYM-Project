"""Dépendances FastAPI : authentification et contrôle des permissions (RBAC)."""
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.utilisateur import Utilisateur

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Utilisateur:
    """Récupère l'utilisateur courant à partir du token JWT."""
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré.",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token mal formé.",
        )

    user = db.query(Utilisateur).filter(Utilisateur.id == uuid.UUID(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable.",
        )

    if not user.actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé.",
        )

    return user


def get_user_permissions(user: Utilisateur) -> list[str]:
    """Retourne la liste des codes de permission de l'utilisateur."""
    if user.role is None:
        return []
    return [perm.code for perm in user.role.permissions]


def require_permission(permission_code: str):
    """
    Fabrique de dépendance : vérifie que l'utilisateur a la permission donnée.
    Le super_admin a accès à tout.

    Usage :
        @router.post("/clients", dependencies=[Depends(require_permission("clients.creation"))])
    """
    def checker(current_user: Utilisateur = Depends(get_current_user)) -> Utilisateur:
        # super_admin : accès total
        if current_user.role and current_user.role.nom == "super_admin":
            return current_user

        permissions = get_user_permissions(current_user)
        if permission_code not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission refusée : {permission_code}",
            )
        return current_user

    return checker


def require_any_permission(*permission_codes: str):
    """Fabrique de dépendance : au moins une des permissions listées."""

    def checker(current_user: Utilisateur = Depends(get_current_user)) -> Utilisateur:
        if current_user.role and current_user.role.nom == "super_admin":
            return current_user

        permissions = get_user_permissions(current_user)
        if not any(code in permissions for code in permission_codes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission refusée : l'une de {', '.join(permission_codes)} est requise.",
            )
        return current_user

    return checker


def require_any_role(*role_names: str):
    """Fabrique de dépendance : l'utilisateur doit avoir l'un des rôles listés."""

    def checker(current_user: Utilisateur = Depends(get_current_user)) -> Utilisateur:
        if current_user.role and current_user.role.nom == "super_admin":
            return current_user

        role = current_user.role.nom if current_user.role else None
        if role not in role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès refusé pour votre rôle.",
            )
        return current_user

    return checker
