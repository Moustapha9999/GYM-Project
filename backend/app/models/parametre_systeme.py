"""Modèle ParametreSysteme — paramètres clé/valeur du système."""
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class ParametreSysteme(Base):
    __tablename__ = "parametres_systeme"

    cle: Mapped[str] = mapped_column(String(100), primary_key=True)
    valeur: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
