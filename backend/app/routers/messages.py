"""Router du Centre de messages (génération de messages prêts à envoyer)."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_any_permission
from app.models.utilisateur import Utilisateur
from app.schemas.common import ApiResponse
from app.schemas.message import MessageGenere, TypeMessage
from app.services import message_service
from app.services.message_service import MessageError

router = APIRouter(prefix="/messages", tags=["Centre de messages"])

_MESSAGE_PERMISSIONS = (
    "notifications.lecture",
    "abonnements.creation",
    "abonnements.modification",
    "abonnements.validation",
    "paiements.creation",
    "cartes_membres.modification",
)


@router.get("/types", response_model=ApiResponse[list[TypeMessage]])
def types_messages(
    _: Utilisateur = Depends(require_any_permission(*_MESSAGE_PERMISSIONS)),
):
    """Liste des types de messages disponibles."""
    return ApiResponse(success=True, data=message_service.types_disponibles())


@router.get("/client/{client_id}", response_model=ApiResponse[list[MessageGenere]])
def messages_client(
    client_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_any_permission(*_MESSAGE_PERMISSIONS)),
):
    """Génère tous les messages pertinents pour un client (centre de messages)."""
    try:
        messages = message_service.generer_tous(db, client_id)
    except MessageError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return ApiResponse(success=True, data=messages)


@router.get("/client/{client_id}/generer", response_model=ApiResponse[MessageGenere])
def generer_message(
    client_id: uuid.UUID,
    type_message: str = Query(..., description="bienvenue, carte_prete, renouvellement, alerte_fin, recu_paiement"),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_any_permission(*_MESSAGE_PERMISSIONS)),
):
    """Génère un message précis pour un client."""
    try:
        message = message_service.generer(db, client_id, type_message)
    except MessageError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ApiResponse(success=True, data=message)
