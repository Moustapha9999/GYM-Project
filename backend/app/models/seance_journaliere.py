"""Modèle SeanceJournaliere — séances payées à l'unité (50 MRU)."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class SeanceJournaliere(Base):
    __tablename__ = "seances_journalieres"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    nom_client_occasionnel: Mapped[str | None] = mapped_column(
        String(150), nullable=True
    )
    date_seance: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
    montant: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=50)
    encaisse_par: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("utilisateurs.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
