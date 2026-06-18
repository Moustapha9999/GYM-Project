"""Schémas Pydantic pour le module RH (Employés + Salaires)."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr


# ── Employés ────────────────────────────────────────────────
class EmployeCreate(BaseModel):
    nom: str
    prenom: str
    fonction: str
    telephone: str | None = None
    email: EmailStr | None = None
    adresse: str | None = None
    date_embauche: date
    type_contrat: str | None = None
    salaire_base: Decimal


class EmployeUpdate(BaseModel):
    nom: str | None = None
    prenom: str | None = None
    fonction: str | None = None
    telephone: str | None = None
    email: EmailStr | None = None
    adresse: str | None = None
    type_contrat: str | None = None
    salaire_base: Decimal | None = None
    statut: str | None = None


class EmployeCompteUtilisateur(BaseModel):
    id: uuid.UUID
    email: str
    actif: bool
    role_nom: str
    role_libelle: str


class EmployeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    nom: str
    prenom: str
    fonction: str
    telephone: str | None
    email: str | None
    adresse: str | None
    date_embauche: date
    type_contrat: str | None
    salaire_base: Decimal
    statut: str
    created_at: datetime
    utilisateur_id: uuid.UUID | None = None
    role_associe: str | None = None
    compte_utilisateur: EmployeCompteUtilisateur | None = None


# ── Fiches de paie ──────────────────────────────────────────
class FichePaieCreate(BaseModel):
    employe_id: uuid.UUID
    mois: int
    annee: int
    primes: Decimal = Decimal("0")
    bonus: Decimal = Decimal("0")
    retenues: Decimal = Decimal("0")


class FichePaieRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    employe_id: uuid.UUID
    mois: int
    annee: int
    salaire_base: Decimal
    primes: Decimal
    bonus: Decimal
    retenues: Decimal
    salaire_final: Decimal | None
    statut_paiement: str
    date_paiement: date | None
    created_at: datetime


class MasseSalariale(BaseModel):
    mois: int
    annee: int
    nombre_fiches: int
    total_brut: Decimal
    total_net: Decimal
