"""Modèle Abonnement — abonnements souscrits par les clients."""
import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Abonnement(Base):
    __tablename__ = "abonnements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    type_abonnement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("types_abonnements.id"), nullable=False
    )
    date_debut: Mapped[date] = mapped_column(Date, nullable=False)
    date_fin: Mapped[date] = mapped_column(Date, nullable=False)
    montant: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    est_inscription: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    statut: Mapped[str] = mapped_column(String(20), nullable=False, default="Actif")
    renouvele_de: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("abonnements.id"), nullable=True
    )
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
    client = relationship("Client", back_populates="abonnements")
    type_abonnement = relationship("TypeAbonnement", back_populates="abonnements")
    cartes = relationship("CarteMembre", back_populates="abonnement")
