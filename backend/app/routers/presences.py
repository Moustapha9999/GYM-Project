"""Router du module Présences."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.common import ApiResponse
from app.schemas.presence import (
    EntreeManuelle,
    EntreeQR,
    PresenceClientInfo,
    PresenceRead,
    SortieRequest,
)
from app.services import presence_service
from app.services.presence_service import PresenceError

router = APIRouter(prefix="/presences", tags=["Présences"])


@router.post("/entree", response_model=ApiResponse[PresenceRead], status_code=status.HTTP_201_CREATED)
def entree_manuelle(
    payload: EntreeManuelle,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("presences.creation")),
):
    """Pointer l'entrée d'un client par recherche manuelle (vérifie l'abonnement)."""
    try:
        presence = presence_service.pointer_entree_manuelle(db, payload.client_id, current_user.id)
    except PresenceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ApiResponse(success=True, data=PresenceRead.model_validate(presence), message="Entrée enregistrée.")


@router.post("/entree-qr", response_model=ApiResponse[PresenceRead], status_code=status.HTTP_201_CREATED)
def entree_qr(
    payload: EntreeQR,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("presences.creation")),
):
    """Pointer l'entrée par scan du QR de la carte (vérifie l'abonnement)."""
    try:
        presence = presence_service.pointer_entree_qr(db, payload.qr_code_uuid, current_user.id)
    except PresenceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ApiResponse(success=True, data=PresenceRead.model_validate(presence), message="Entrée enregistrée (QR).")


@router.patch("/sortie", response_model=ApiResponse[PresenceRead])
def sortie(
    payload: SortieRequest,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("presences.modification")),
):
    """Pointer la sortie (par presence_id ou re-scan QR). Calcule la durée."""
    try:
        presence = presence_service.pointer_sortie(
            db, presence_id=payload.presence_id, qr_code_uuid=payload.qr_code_uuid
        )
    except PresenceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ApiResponse(
        success=True,
        data=PresenceRead.model_validate(presence),
        message=f"Sortie enregistrée — durée {presence.duree_minutes} min.",
    )


@router.get("/jour", response_model=ApiResponse[list[PresenceClientInfo]])
def presences_du_jour(
    jour: date | None = Query(None, description="Jour (défaut : aujourd'hui)"),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("presences.lecture")),
):
    """Liste des présences du jour avec infos clients."""
    data = presence_service.lister_du_jour(db, jour)
    return ApiResponse(success=True, data=data, message=None)
