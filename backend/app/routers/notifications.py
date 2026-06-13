"""Router du module Notifications."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.notification import NotificationEnvoi, NotificationRead
from app.services import notification_service
from app.utils.pagination import paginate

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=PaginatedResponse[NotificationRead])
def lister_notifications(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("notifications.lecture")),
    statut: str | None = Query(None),
    type_notification: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = notification_service.lister(db, statut=statut, type_notification=type_notification)
    items, meta = paginate(query, page, per_page)
    return PaginatedResponse(success=True, data=[NotificationRead.model_validate(n) for n in items], meta=meta)


@router.post("/envoyer", response_model=ApiResponse[NotificationRead])
def envoyer_notification(
    payload: NotificationEnvoi,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("notifications.creation")),
):
    notif = notification_service.envoyer(
        db,
        destinataire_type=payload.destinataire_type,
        numero_telephone=payload.numero_telephone,
        type_notification=payload.type_notification,
        message=payload.message,
        client_id=payload.client_id,
        employe_id=payload.employe_id,
    )
    msg = "Notification envoyée." if notif.statut == "Envoyé" else f"Échec d'envoi (statut: {notif.statut})."
    return ApiResponse(success=True, data=NotificationRead.model_validate(notif), message=msg)
