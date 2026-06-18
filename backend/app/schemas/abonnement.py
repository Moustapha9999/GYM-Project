"""Schémas Pydantic pour le module Abonnements."""
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


# ── Entrée : souscription / renouvellement ──────────────────
class AbonnementCreate(BaseModel):
    client_id: uuid.UUID
    moyen_paiement_id: uuid.UUID


class AbonnementUpdate(BaseModel):
    """Modification manuelle (super administrateur)."""
    date_debut: date | None = None
    date_fin: date | None = None
    montant: Decimal | None = Field(None, ge=0)
    statut: Literal["Actif", "Suspendu", "Résilié", "Expiré"] | None = None
    est_inscription: bool | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "AbonnementUpdate":
        if self.date_debut and self.date_fin and self.date_fin < self.date_debut:
            raise ValueError("La date de fin doit être postérieure à la date de début.")
        return self


# ── Sortie : carte liée ─────────────────────────────────────
class CarteInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    qr_code_uuid: uuid.UUID
    date_expiration: date
    statut: str


# ── Sortie : lecture abonnement ─────────────────────────────
class AbonnementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    type_abonnement_id: uuid.UUID
    date_debut: date
    date_fin: date
    montant: Decimal
    statut: str
    est_inscription: bool
    renouvele_de: uuid.UUID | None
    created_at: datetime


# ── Sortie : résultat complet de souscription ───────────────
class SouscriptionResult(BaseModel):
    abonnement: AbonnementRead
    carte: CarteInfo
    paiement_reference: str
    montant_paye: Decimal
    type_tarif: str  # "inscription" ou "renouvellement"


class AbonnementListItem(BaseModel):
    """Abonnement enrichi pour la liste (client + formule lisibles)."""
    id: uuid.UUID
    client_id: uuid.UUID
    client_nom: str
    type_abonnement: str
    date_debut: date
    date_fin: date
    montant: Decimal
    statut: str
    est_inscription: bool
    created_at: datetime
    jours_retard: int = 0
    en_retard: bool = False
    hors_delai_grace: bool = False


class TypeAbonnementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nom: str
    sexe: str | None
    duree_jours: int
    montant: Decimal
    montant_inscription: Decimal
    description: str | None
    actif: bool
