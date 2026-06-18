"""Schémas Pydantic pour la gestion des utilisateurs."""
import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.password import validate_password_strength
from app.schemas.auth import RoleInfo

PasswordField = Annotated[str, Field(min_length=8, max_length=128)]


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
    password: PasswordField
    telephone: str | None = Field(None, max_length=20)
    role_nom: str = Field(default="receptionniste", max_length=50)

    @field_validator("password")
    @classmethod
    def check_password(cls, value: str) -> str:
        return validate_password_strength(value)


class UtilisateurUpdate(BaseModel):
    nom: str | None = Field(None, min_length=2, max_length=100)
    prenom: str | None = Field(None, min_length=2, max_length=100)
    email: EmailStr | None = None
    password: PasswordField | None = None
    telephone: str | None = Field(None, max_length=20)
    role_nom: str | None = Field(None, max_length=50)
    actif: bool | None = None

    @field_validator("password")
    @classmethod
    def check_password(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return validate_password_strength(value)


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nom: str
    libelle: str
    systeme: bool = False


class PermissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    module: str
    action: str
    libelle: str | None = None


class RoleDetailRead(RoleRead):
    description: str | None = None
    systeme: bool
    permissions: list[PermissionRead] = []


class RolePermissionsUpdate(BaseModel):
    permission_ids: list[uuid.UUID]
