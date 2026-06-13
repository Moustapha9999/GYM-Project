"""Schémas Pydantic pour le module Présences."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, model_validator


class EntreeManuelle(BaseModel):
    """Pointage entrée par recherche manuelle (client_id)."""
    client_id: uuid.UUID


class EntreeQR(BaseModel):
    """Pointage entrée par scan du QR (qr_code_uuid de la carte)."""
    qr_code_uuid: uuid.UUID


class SortieRequest(BaseModel):
    """Sortie : soit par presence_id, soit par qr_code_uuid (re-scan)."""
    presence_id: uuid.UUID | None = None
    qr_code_uuid: uuid.UUID | None = None

    @model_validator(mode="after")
    def valider(self):
        if not self.presence_id and not self.qr_code_uuid:
            raise ValueError("Indiquez presence_id ou qr_code_uuid.")
        return self


class PresenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    methode: str
    heure_entree: datetime
    heure_sortie: datetime | None
    duree_minutes: int | None
    created_at: datetime


class PresenceClientInfo(BaseModel):
    """Présence enrichie avec infos client (pour la liste du jour)."""
    id: uuid.UUID
    client_id: uuid.UUID
    client_nom: str
    client_prenom: str
    numero_membre: str
    methode: str
    heure_entree: datetime
    heure_sortie: datetime | None
    duree_minutes: int | None
