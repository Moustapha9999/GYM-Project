"""Schémas Pydantic pour le module Dépenses / Finances."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CategorieDepenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    nom: str


class DepenseCreate(BaseModel):
    categorie_id: uuid.UUID
    libelle: str
    montant: Decimal
    date_depense: date | None = None
    justificatif_url: str | None = None


class DepenseUpdate(BaseModel):
    categorie_id: uuid.UUID | None = None
    libelle: str | None = None
    montant: Decimal | None = None
    date_depense: date | None = None
    justificatif_url: str | None = None


class DepenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    reference: str
    categorie_id: uuid.UUID
    libelle: str
    montant: Decimal
    date_depense: date
    justificatif_url: str | None
    created_at: datetime


class BilanFinancier(BaseModel):
    date_debut: date
    date_fin: date
    total_revenus: Decimal
    total_depenses: Decimal
    benefice: Decimal
    depenses_par_categorie: list[dict]
