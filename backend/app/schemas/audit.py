"""Schémas Pydantic pour le Journal d'audit."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    utilisateur_id: uuid.UUID | None
    action: str
    module: str
    cible_table: str | None
    cible_id: uuid.UUID | None
    details: dict | None
    adresse_ip: str | None
    created_at: datetime
