"""Modèle FichePaie — fiches de paie mensuelles."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class FichePaie(Base):
    __tablename__ = "fiches_paie"
    __table_args__ = (
        UniqueConstraint("employe_id", "mois", "annee", name="uq_fiche_paie_periode"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    employe_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employes.id", ondelete="CASCADE"),
        nullable=False,
    )
    mois: Mapped[int] = mapped_column(Integer, nullable=False)
    annee: Mapped[int] = mapped_column(Integer, nullable=False)
    salaire_base: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    primes: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    bonus: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    retenues: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    # salaire_final est une colonne générée côté DB (voir migration)
    salaire_final: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    statut_paiement: Mapped[str] = mapped_column(String(20), default="En attente")
    date_paiement: Mapped[date | None] = mapped_column(Date, nullable=True)
    fiche_pdf_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("utilisateurs.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    employe = relationship("Employe", back_populates="fiches_paie")
