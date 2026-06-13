"""Modèles CategorieDepense et Depense — gestion des dépenses."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class CategorieDepense(Base):
    __tablename__ = "categories_depenses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nom: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    depenses = relationship("Depense", back_populates="categorie")


class Depense(Base):
    __tablename__ = "depenses"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    reference: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    categorie_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories_depenses.id"), nullable=False
    )
    libelle: Mapped[str] = mapped_column(String(200), nullable=False)
    montant: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    date_depense: Mapped[date] = mapped_column(
        Date, nullable=False, server_default=func.current_date()
    )
    justificatif_url: Mapped[str | None] = mapped_column(String, nullable=True)
    valide_par: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("utilisateurs.id"), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("utilisateurs.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    categorie = relationship("CategorieDepense", back_populates="depenses")
