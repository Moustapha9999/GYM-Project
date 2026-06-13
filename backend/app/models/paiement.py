"""Modèle Paiement — encaissements (abonnements, séances, services)."""
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Paiement(Base):
    __tablename__ = "paiements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    reference: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    abonnement_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("abonnements.id"), nullable=True
    )
    seance_journaliere_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("seances_journalieres.id"), nullable=True
    )
    type_paiement: Mapped[str] = mapped_column(String(30), nullable=False)
    montant: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    moyen_paiement_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("moyens_paiement.id"), nullable=False
    )
    statut: Mapped[str] = mapped_column(String(20), nullable=False, default="Validé")
    facture_pdf_url: Mapped[str | None] = mapped_column(String, nullable=True)
    recu_pdf_url: Mapped[str | None] = mapped_column(String, nullable=True)
    encaisse_par: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("utilisateurs.id"), nullable=False
    )
    date_paiement: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relations
    moyen_paiement = relationship("MoyenPaiement", back_populates="paiements")
