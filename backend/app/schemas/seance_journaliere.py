"""Schémas Pydantic pour le module Séances journalières."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, model_validator


class SeanceCreate(BaseModel):
    """
    Création d'une séance journalière.
    Soit un client enregistré (client_id), soit un client occasionnel (nom).
    """
    client_id: uuid.UUID | None = None
    nom_client_occasionnel: str | None = None
    moyen_paiement_id: uuid.UUID

    @model_validator(mode="after")
    def valider_client(self):
        if not self.client_id and not self.nom_client_occasionnel:
            raise ValueError(
                "Indiquez soit un client enregistré, soit un nom de client occasionnel."
            )
        return self


class SeanceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID | None
    nom_client_occasionnel: str | None
    date_seance: date
    montant: Decimal
    created_at: datetime


class SeanceResult(BaseModel):
    seance: SeanceRead
    paiement_reference: str
    montant_paye: Decimal
