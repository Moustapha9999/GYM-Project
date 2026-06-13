"""Schémas Pydantic pour le module Notifications."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationEnvoi(BaseModel):
    """Demande d'envoi d'une notification."""
    destinataire_type: str  # 'Client' | 'Employé'
    client_id: uuid.UUID | None = None
    employe_id: uuid.UUID | None = None
    numero_telephone: str
    type_notification: str
    message: str


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    destinataire_type: str
    client_id: uuid.UUID | None
    employe_id: uuid.UUID | None
    numero_telephone: str
    canal: str
    type_notification: str
    message: str
    statut: str
    fallback_sms_envoye: bool
    date_envoi: datetime | None
    created_at: datetime
