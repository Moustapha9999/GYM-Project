"""Schémas Pydantic pour les paramètres système / apparence."""
from pydantic import BaseModel, Field


class ParametreRead(BaseModel):
    cle: str
    valeur: str | None
    description: str | None = None


class AppSettingsRead(BaseModel):
    nom_salle: str = "TOTAL FITNESS"
    numero_salle: str = ""
    slogan: str = "Discipline · Force · Résultats"
    logo_url: str | None = None
    theme_couleur: str = "#ea580c"
    theme_mode: str = "light"
    langue: str = "fr"


class AppSettingsUpdate(BaseModel):
    nom_salle: str | None = Field(None, min_length=2, max_length=100)
    numero_salle: str | None = Field(None, max_length=30)
    slogan: str | None = Field(None, max_length=200)
    logo_url: str | None = None
    theme_couleur: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    theme_mode: str | None = Field(None, pattern=r"^(light|dark)$")
    langue: str | None = Field(None, pattern=r"^(fr|en|ar)$")
