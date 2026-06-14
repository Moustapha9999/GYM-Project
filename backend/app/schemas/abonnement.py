"""Schémas Pydantic pour le module Abonnements."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


# ── Entrée : souscription / renouvellement ──────────────────
class AbonnementCreate(BaseModel):
    client_id: uuid.UUID
    moyen_paiement_id: uuid.UUID


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
