"""Schémas Pydantic pour les Paramètres système."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ParametreRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    cle: str
    valeur: str | None
    description: str | None
    updated_at: datetime


class ParametreUpdate(BaseModel):
    valeur: str
