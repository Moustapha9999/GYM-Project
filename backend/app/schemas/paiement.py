"""Schémas Pydantic pour le module Paiements."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class PaiementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reference: str
    client_id: uuid.UUID | None
    abonnement_id: uuid.UUID | None
    seance_journaliere_id: uuid.UUID | None
    type_paiement: str
    montant: Decimal
    moyen_paiement_id: uuid.UUID
    statut: str
    date_paiement: datetime
    created_at: datetime


class PaiementDetail(BaseModel):
    """Paiement enrichi avec libellés (pour le journal lisible)."""
    id: uuid.UUID
    reference: str
    client_nom: str | None
    type_paiement: str
    montant: Decimal
    moyen_paiement: str
    statut: str
    date_paiement: datetime


class RepartitionMoyen(BaseModel):
    moyen_paiement: str
    nombre: int
    total: Decimal


class CaisseJour(BaseModel):
    """Synthèse de la caisse d'un jour."""
    jour: date
    total_encaisse: Decimal
    nombre_paiements: int
    repartition: list[RepartitionMoyen]
    total_abonnements: Decimal
    total_seances: Decimal
