"""Schémas Pydantic pour l'authentification."""
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RoleInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    nom: str
    libelle: str


class UtilisateurInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    nom: str
    prenom: str
    email: EmailStr
    role: RoleInfo
    permissions: list[str] = []


class TokenData(BaseModel):
    token: str
    type: str = "bearer"
    utilisateur: UtilisateurInfo
