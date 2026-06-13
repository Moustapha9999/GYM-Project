"""Modèle TypeAbonnement — formules d'abonnement (Mensuel Homme/Femme)."""
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy import Boolean, DateTime, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class TypeAbonnement(Base):
    __tablename__ = "types_abonnements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    nom: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    sexe: Mapped[str | None] = mapped_column(String(10), nullable=True)  # Homme / Femme / None (mixte)
    duree_jours: Mapped[int] = mapped_column(Integer, nullable=False)
    montant: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)  # tarif renouvellement
    montant_inscription: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )  # tarif 1er mois (inscription incluse)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    avantages: Mapped[str | None] = mapped_column(String, nullable=True)
    actif: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    abonnements = relationship("Abonnement", back_populates="type_abonnement")