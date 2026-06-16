"""Schemas Pydantic pour les rapports détaillés."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class FichePaieRapportRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employe_nom: str
    fonction: str | None = None
    mois: int
    annee: int
    salaire_base: Decimal
    primes: Decimal
    bonus: Decimal
    retenues: Decimal
    salaire_final: Decimal | None = None
    statut_paiement: str
    date_paiement: date | None = None
    created_at: datetime


class JournalAuditRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    action: str
    module: str
    cible_table: str | None = None
    cible_id: uuid.UUID | None = None
    details: dict | None = None
    adresse_ip: str | None = None
    user_agent: str | None = None
    utilisateur_nom: str | None = None
    role_nom: str | None = None


class JournalCaisseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    date_jour: date
    total_encaisse: Decimal
    total_depenses: Decimal
    solde: Decimal
    statut: str
    cloture_le: datetime | None = None
    cloture_par_nom: str | None = None
    created_at: datetime


class JournalClientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    numero_membre: str
    nom: str
    prenom: str
    telephone: str
    email: str | None = None
    actif: bool
    created_at: datetime
    derniere_presence: datetime | None = None
    dernier_abonnement_fin: date | None = None
