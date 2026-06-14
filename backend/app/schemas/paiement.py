"""Schémas Pydantic pour le module Paiements."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, model_validator


TYPES_PAIEMENT = (
    "Abonnement",
    "Séance journalière",
    "Service supplémentaire",
    "Autre",
)


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


class PaiementCreate(BaseModel):
    """Création d'un paiement (abonnement, séance ou encaissement manuel)."""
    type_paiement: str
    moyen_paiement_id: uuid.UUID
    client_id: uuid.UUID | None = None
    nom_client_occasionnel: str | None = None
    montant: Decimal | None = None

    @model_validator(mode="after")
    def valider_payload(self):
        if self.type_paiement not in TYPES_PAIEMENT:
            raise ValueError(
                f"Type invalide. Valeurs acceptées : {', '.join(TYPES_PAIEMENT)}"
            )
        if self.type_paiement == "Abonnement" and not self.client_id:
            raise ValueError("Un client enregistré est requis pour un abonnement.")
        if self.type_paiement == "Séance journalière":
            if not self.client_id and not self.nom_client_occasionnel:
                raise ValueError(
                    "Indiquez un client enregistré ou un nom de client occasionnel."
                )
        if self.type_paiement in ("Service supplémentaire", "Autre"):
            if self.montant is None or self.montant <= 0:
                raise ValueError("Un montant positif est requis pour ce type de paiement.")
        return self


class PaiementCreateResult(BaseModel):
    paiement_reference: str
    montant: Decimal
    type_paiement: str


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


class MoyenPaiementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    libelle: str
    actif: bool
