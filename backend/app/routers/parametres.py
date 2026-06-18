"""Router des paramètres système / apparence."""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.common import ApiResponse
from app.schemas.parametre import AppSettingsRead, AppSettingsUpdate
from app.services import audit_service, parametre_service

router = APIRouter(prefix="/parametres", tags=["Paramètres"])


@router.get("/app", response_model=ApiResponse[AppSettingsRead])
def lire_parametres_app(db: Session = Depends(get_db)):
    """Paramètres publics de l'application (nom, logo, thème)."""
    return ApiResponse(success=True, data=parametre_service.lire_app_settings(db))


@router.put("/app", response_model=ApiResponse[AppSettingsRead])
def modifier_parametres_app(
    payload: AppSettingsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("parametres.modification")),
):
    """Met à jour les paramètres d'apparence de l'application."""
    settings = parametre_service.mettre_a_jour_app_settings(db, payload)
    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="modification_apparence",
        module="parametres",
        cible_table="parametres_systeme",
        request=request,
    )
    db.commit()
    return ApiResponse(success=True, data=settings, message="Paramètres enregistrés.")
