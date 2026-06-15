"""Service métier — rôles et permissions RBAC."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models.permission import Permission
from app.models.role import Role

ROLES_NON_MODIFIABLES = {"super_admin"}


def lister_permissions(db: Session) -> list[Permission]:
    return (
        db.query(Permission)
        .order_by(Permission.module, Permission.action)
        .all()
    )


def obtenir_role(db: Session, role_id: uuid.UUID) -> Role | None:
    return (
        db.query(Role)
        .options(joinedload(Role.permissions))
        .filter(Role.id == role_id)
        .first()
    )


def mettre_a_jour_permissions(
    db: Session, role: Role, permission_ids: list[uuid.UUID]
) -> Role:
    if role.nom in ROLES_NON_MODIFIABLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Les permissions du super administrateur ne peuvent pas être modifiées.",
        )

    permissions = db.query(Permission).filter(Permission.id.in_(permission_ids)).all()
    if len(permissions) != len(set(permission_ids)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Une ou plusieurs permissions sont introuvables.",
        )

    role.permissions = permissions
    db.commit()
    db.refresh(role)

    return (
        db.query(Role)
        .options(joinedload(Role.permissions))
        .filter(Role.id == role.id)
        .first()
    )
