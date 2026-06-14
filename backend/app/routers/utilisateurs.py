"""Router Administration — utilisateurs et rôles."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.common import ApiResponse
from app.schemas.utilisateur import RoleRead, UtilisateurCreate, UtilisateurRead
from app.services import utilisateur_service

router = APIRouter(tags=["Administration"])


@router.get(
    "/utilisateurs",
    response_model=ApiResponse[list[UtilisateurRead]],
)
def lister_utilisateurs(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("utilisateurs.lecture")),
):
    """Liste tous les utilisateurs du système."""
    users = utilisateur_service.lister(db)
    return ApiResponse(
        success=True,
        data=[UtilisateurRead.model_validate(u) for u in users],
        message=None,
    )


@router.post(
    "/utilisateurs",
    response_model=ApiResponse[UtilisateurRead],
    status_code=status.HTTP_201_CREATED,
)
def creer_utilisateur(
    payload: UtilisateurCreate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("utilisateurs.creation")),
):
    """Crée un utilisateur (réceptionniste, coach…)."""
    utilisateur = utilisateur_service.creer(db, payload)
    return ApiResponse(
        success=True,
        data=UtilisateurRead.model_validate(utilisateur),
        message=f"Utilisateur {utilisateur.prenom} {utilisateur.nom} créé avec succès.",
    )


@router.get(
    "/roles",
    response_model=ApiResponse[list[RoleRead]],
)
def lister_roles(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("roles.lecture")),
):
    """Liste les rôles disponibles."""
    roles = utilisateur_service.lister_roles(db)
    return ApiResponse(
        success=True,
        data=[RoleRead.model_validate(r) for r in roles],
        message=None,
    )
