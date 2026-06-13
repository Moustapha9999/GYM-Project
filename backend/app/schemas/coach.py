"""Schémas Pydantic pour le module Coach (Programmes + Planning)."""
import uuid
from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, model_validator


# ── Programmes sportifs ─────────────────────────────────────
class ProgrammeCreate(BaseModel):
    client_id: uuid.UUID
    coach_id: uuid.UUID
    titre: str
    objectif: str | None = None
    description: str | None = None
    date_debut: date
    date_fin: date | None = None


class ProgrammeUpdate(BaseModel):
    titre: str | None = None
    objectif: str | None = None
    description: str | None = None
    date_fin: date | None = None
    actif: bool | None = None


class ProgrammeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    client_id: uuid.UUID
    coach_id: uuid.UUID
    titre: str
    objectif: str | None
    description: str | None
    date_debut: date
    date_fin: date | None
    actif: bool
    created_at: datetime


# ── Planning ────────────────────────────────────────────────
class PlanningCreate(BaseModel):
    coach_id: uuid.UUID
    client_id: uuid.UUID | None = None
    titre: str
    date_seance: date
    heure_debut: time
    heure_fin: time

    @model_validator(mode="after")
    def valider_heures(self):
        if self.heure_fin <= self.heure_debut:
            raise ValueError("L'heure de fin doit être après l'heure de début.")
        return self


class PlanningUpdate(BaseModel):
    titre: str | None = None
    date_seance: date | None = None
    heure_debut: time | None = None
    heure_fin: time | None = None
    statut: str | None = None


class PlanningRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    coach_id: uuid.UUID
    client_id: uuid.UUID | None
    titre: str
    date_seance: date
    heure_debut: time
    heure_fin: time
    statut: str
    created_at: datetime
