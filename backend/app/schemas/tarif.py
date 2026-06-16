"""Schémas Pydantic pour la gestion des tarifs."""
import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class TarifAbonnementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nom: str
    sexe: str
    duree_jours: int
    montant: Decimal
    montant_inscription: Decimal


class TarifsRead(BaseModel):
    tarif_seance_journaliere: Decimal
    abonnement_homme: TarifAbonnementRead
    abonnement_femme: TarifAbonnementRead


class TarifAbonnementUpdate(BaseModel):
    montant: Decimal = Field(gt=0, description="Tarif renouvellement (MRU)")
    montant_inscription: Decimal = Field(gt=0, description="Tarif 1er mois / inscription (MRU)")


class TarifsUpdate(BaseModel):
    tarif_seance_journaliere: Decimal = Field(gt=0, description="Tarif séance journalière (MRU)")
    abonnement_homme: TarifAbonnementUpdate
    abonnement_femme: TarifAbonnementUpdate
