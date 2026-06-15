"""Schémas Pydantic pour le module Clients."""
import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


# ── Entrée : création ───────────────────────────────────────
class ClientCreate(BaseModel):
    nom: str
    prenom: str
    sexe: str | None = None
    date_naissance: date | None = None
    telephone: str
    whatsapp: str | None = None
    adresse: str | None = None
    email: EmailStr | None = None
    numero_piece_identite: str | None = None
    contact_urgence_nom: str | None = None
    contact_urgence_telephone: str | None = None
    groupe_sanguin: str | None = None

    @field_validator("sexe")
    @classmethod
    def valider_sexe(cls, v):
        if v is not None and v not in ("Homme", "Femme"):
            raise ValueError("Le sexe doit être 'Homme' ou 'Femme'.")
        return v

    @field_validator("groupe_sanguin")
    @classmethod
    def valider_groupe(cls, v):
        groupes = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
        if v is not None and v not in groupes:
            raise ValueError(f"Groupe sanguin invalide. Valeurs : {', '.join(sorted(groupes))}")
        return v


# ── Entrée : modification (tous les champs optionnels) ──────
class ClientUpdate(BaseModel):
    nom: str | None = None
    prenom: str | None = None
    sexe: str | None = None
    date_naissance: date | None = None
    telephone: str | None = None
    whatsapp: str | None = None
    adresse: str | None = None
    email: EmailStr | None = None
    numero_piece_identite: str | None = None
    contact_urgence_nom: str | None = None
    contact_urgence_telephone: str | None = None
    groupe_sanguin: str | None = None
    actif: bool | None = None


class ClientPhotoUpdate(BaseModel):
    """Photo encodée en base64 (data URL ou brut)."""
    photo_base64: str


class ImportLigneErreur(BaseModel):
    ligne: int
    message: str


class ClientImportResult(BaseModel):
    total_lignes: int
    crees: int
    echecs: int
    erreurs: list[ImportLigneErreur]


# ── Sortie : lecture ────────────────────────────────────────
class ClientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    numero_membre: str
    nom: str
    prenom: str
    sexe: str | None
    date_naissance: date | None
    telephone: str
    whatsapp: str | None
    adresse: str | None
    email: str | None
    photo_url: str | None
    numero_piece_identite: str | None
    contact_urgence_nom: str | None
    contact_urgence_telephone: str | None
    groupe_sanguin: str | None
    actif: bool
    created_at: datetime
