"""Modèle JournalCaisse — clôture journalière de caisse."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class JournalCaisse(Base):
    __tablename__ = "journal_caisse"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    date_jour: Mapped[date] = mapped_column(
        Date, unique=True, nullable=False, server_default=func.current_date()
    )
    total_encaisse: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    total_depenses: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    solde: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    cloture_par: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("utilisateurs.id"), nullable=True
    )
    cloture_le: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    statut: Mapped[str] = mapped_column(String(20), default="Ouverte")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
