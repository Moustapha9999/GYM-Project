"""Schémas Pydantic pour le centre de messages."""
import uuid

from pydantic import BaseModel


class TypeMessage(BaseModel):
    code: str
    libelle: str


class MessageGenere(BaseModel):
    type_message: str
    libelle: str
    client_id: uuid.UUID
    client_nom: str
    numero_telephone: str | None
    texte: str
    lien_whatsapp: str | None
