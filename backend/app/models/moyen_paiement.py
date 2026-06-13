"""Modèle MoyenPaiement — moyens de paiement (Cash, Bankily, etc.)."""
import uuid

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MoyenPaiement(Base):
    __tablename__ = "moyens_paiement"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    libelle: Mapped[str] = mapped_column(String(50), nullable=False)
    actif: Mapped[bool] = mapped_column(Boolean, default=True)

    paiements = relationship("Paiement", back_populates="moyen_paiement")
