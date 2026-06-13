"""Modèle Client — adhérents de la salle de sport."""
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    numero_membre: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenom: Mapped[str] = mapped_column(String(100), nullable=False)
    sexe: Mapped[str | None] = mapped_column(String(10), nullable=True)
    date_naissance: Mapped[date | None] = mapped_column(Date, nullable=True)
    telephone: Mapped[str] = mapped_column(String(20), nullable=False)
    whatsapp: Mapped[str | None] = mapped_column(String(20), nullable=True)
    adresse: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    numero_piece_identite: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contact_urgence_nom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contact_urgence_telephone: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    groupe_sanguin: Mapped[str | None] = mapped_column(String(5), nullable=True)
    actif: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("utilisateurs.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relations
    abonnements = relationship("Abonnement", back_populates="client")
    presences = relationship("Presence", back_populates="client")
    cartes = relationship("CarteMembre", back_populates="client")
