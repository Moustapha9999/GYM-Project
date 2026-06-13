"""Modèle ProgrammeSportif — programmes d'entraînement personnalisés."""
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ProgrammeSportif(Base):
    __tablename__ = "programmes_sportifs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    coach_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employes.id"), nullable=False
    )
    titre: Mapped[str] = mapped_column(String(150), nullable=False)
    objectif: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    date_debut: Mapped[date] = mapped_column(Date, nullable=False)
    date_fin: Mapped[date | None] = mapped_column(Date, nullable=True)
    actif: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    coach = relationship("Employe", back_populates="programmes")
