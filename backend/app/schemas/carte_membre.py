"""Schémas Pydantic pour le module Cartes membres."""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class CarteMembreListItem(BaseModel):
    """Carte membre enrichie pour la liste."""
    id: uuid.UUID
    client_id: uuid.UUID
    abonnement_id: uuid.UUID | None
    qr_code_uuid: uuid.UUID
    date_generation: datetime
    date_expiration: date
    statut: str
    client_numero: str
    client_nom: str
    client_prenom: str
    client_telephone: str
    client_whatsapp: str | None
    client_photo_url: str | None
    type_abonnement: str | None


class CarteMembreRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    abonnement_id: uuid.UUID | None
    qr_code_uuid: uuid.UUID
    qr_code_url: str | None
    date_generation: datetime
    date_expiration: date
    statut: str
    created_at: datetime


class ClientPhotoUpdate(BaseModel):
    """Photo du client encodée en base64 (data URL ou brut)."""
    photo_base64: str


class EnvoiWhatsappResult(BaseModel):
    statut: str
    numero: str
    message: str | None = None
    lien_whatsapp: str | None = None
