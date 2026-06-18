"""
Service métier des Notifications.

Orchestre l'envoi WhatsApp via le micro-service Baileys (HTTP).
Si WhatsApp échoue et que le fallback SMS est actif, bascule sur SMS.
Toutes les tentatives sont tracées en base.
"""
import base64
import uuid
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.notification import Notification
from app.models.parametre_systeme import ParametreSysteme


def _get_param(db: Session, cle: str, defaut: str = "") -> str:
    p = db.query(ParametreSysteme).filter(ParametreSysteme.cle == cle).first()
    return p.valeur if p and p.valeur is not None else defaut


def _notification_service_url() -> str:
    """URL du micro-service — uniquement depuis la config (évite SSRF via paramètres DB)."""
    return settings.NOTIFICATION_SERVICE_URL.rstrip("/")


def _notification_headers() -> dict[str, str]:
    headers: dict[str, str] = {}
    if settings.NOTIFICATION_API_SECRET:
        headers["x-api-secret"] = settings.NOTIFICATION_API_SECRET
    return headers


def lister(db: Session, statut: str | None = None, type_notification: str | None = None):
    query = db.query(Notification)
    if statut:
        query = query.filter(Notification.statut == statut)
    if type_notification:
        query = query.filter(Notification.type_notification == type_notification)
    return query.order_by(Notification.created_at.desc())


def _envoyer_whatsapp(service_url: str, numero: str, message: str) -> dict:
    """Appelle le micro-service Baileys. Retourne {success, message_id?}."""
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                f"{service_url}/send",
                json={"numero": numero, "message": message},
                headers=_notification_headers(),
            )
            if resp.status_code == 200:
                data = resp.json()
                return {"success": True, "message_id": data.get("message_id")}
            return {"success": False, "erreur": f"HTTP {resp.status_code}"}
    except Exception as e:
        return {"success": False, "erreur": str(e)}


def _envoyer_document_whatsapp(
    service_url: str,
    numero: str,
    filename: str,
    document_bytes: bytes,
    caption: str,
) -> dict:
    """Envoie un document PDF via le micro-service Baileys."""
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{service_url}/send-document",
                json={
                    "numero": numero,
                    "filename": filename,
                    "document_base64": base64.b64encode(document_bytes).decode(),
                    "caption": caption,
                },
                headers=_notification_headers(),
            )
            if resp.status_code == 200:
                data = resp.json()
                return {"success": True, "message_id": data.get("message_id")}
            return {"success": False, "erreur": f"HTTP {resp.status_code}"}
    except Exception as e:
        return {"success": False, "erreur": str(e)}


def _envoyer_sms(numero: str, message: str) -> dict:
    """
    STUB SMS — à brancher sur un vrai provider (Twilio, etc.).
    Pour l'instant, simule un échec contrôlé (pas de provider configuré).
    """
    return {"success": False, "erreur": "Provider SMS non configuré"}


def envoyer(
    db: Session,
    destinataire_type: str,
    numero_telephone: str,
    type_notification: str,
    message: str,
    client_id: uuid.UUID | None = None,
    employe_id: uuid.UUID | None = None,
) -> Notification:
    """Crée la notification, tente WhatsApp puis SMS si besoin, trace le résultat."""
    notif = Notification(
        destinataire_type=destinataire_type,
        client_id=client_id,
        employe_id=employe_id,
        numero_telephone=numero_telephone,
        canal="whatsapp",
        type_notification=type_notification,
        message=message,
        statut="En attente",
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    service_url = _notification_service_url()
    resultat = _envoyer_whatsapp(service_url, numero_telephone, message)

    if resultat["success"]:
        notif.statut = "Envoyé"
        notif.provider_message_id = resultat.get("message_id")
        notif.date_envoi = datetime.now(timezone.utc)
    else:
        sms_actif = _get_param(db, "sms_fallback_actif", "false").lower() == "true"
        if sms_actif:
            notif.canal = "sms"
            sms_res = _envoyer_sms(numero_telephone, message)
            if sms_res["success"]:
                notif.statut = "Envoyé"
                notif.fallback_sms_envoye = True
                notif.date_envoi = datetime.now(timezone.utc)
            else:
                notif.statut = "Échoué"
        else:
            notif.statut = "Échoué"

    db.commit()
    db.refresh(notif)
    return notif


def envoyer_document(
    db: Session,
    destinataire_type: str,
    numero_telephone: str,
    type_notification: str,
    message: str,
    document_bytes: bytes,
    filename: str,
    client_id: uuid.UUID | None = None,
    employe_id: uuid.UUID | None = None,
) -> Notification:
    """Crée la notification et envoie un document PDF via WhatsApp."""
    notif = Notification(
        destinataire_type=destinataire_type,
        client_id=client_id,
        employe_id=employe_id,
        numero_telephone=numero_telephone,
        canal="whatsapp",
        type_notification=type_notification,
        message=message,
        statut="En attente",
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    service_url = _notification_service_url()
    resultat = _envoyer_document_whatsapp(
        service_url, numero_telephone, filename, document_bytes, message
    )

    if resultat["success"]:
        notif.statut = "Envoyé"
        notif.provider_message_id = resultat.get("message_id")
        notif.date_envoi = datetime.now(timezone.utc)
    else:
        notif.statut = "Échoué"

    db.commit()
    db.refresh(notif)
    return notif
