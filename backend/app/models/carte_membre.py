"""Modèle CarteMembre — carte d'accès avec QR Code."""
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class CarteMembre(Base):
    __tablename__ = "cartes_membres"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    abonnement_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("abonnements.id"), nullable=True
    )
    qr_code_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4
    )
    qr_code_url: Mapped[str | None] = mapped_column(String, nullable=True)
    date_generation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    date_expiration: Mapped[date] = mapped_column(Date, nullable=False)
    statut: Mapped[str] = mapped_column(String(20), nullable=False, default="Actif")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relations
    client = relationship("Client", back_populates="cartes")
    abonnement = relationship("Abonnement", back_populates="cartes")
