"""Schémas Pydantic pour la gestion des utilisateurs."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.auth import RoleInfo


class UtilisateurRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nom: str
    prenom: str
    email: EmailStr
    telephone: str | None = None
    actif: bool
    role: RoleInfo
    created_at: datetime | None = None


class UtilisateurCreate(BaseModel):
    nom: str = Field(..., min_length=2, max_length=100)
    prenom: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)
    telephone: str | None = Field(None, max_length=20)
    role_nom: str = Field(default="receptionniste", max_length=50)


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nom: str
    libelle: str
