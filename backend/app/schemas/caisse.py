"""Schémas Pydantic pour la clôture de caisse."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class EtatCaisse(BaseModel):
    jour: date
    total_encaisse: Decimal
    total_depenses: Decimal
    solde: Decimal


class JournalCaisseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    date_jour: date
    total_encaisse: Decimal
    total_depenses: Decimal
    solde: Decimal
    statut: str
    cloture_le: datetime | None


class ClotureRequest(BaseModel):
    jour: date | None = None
