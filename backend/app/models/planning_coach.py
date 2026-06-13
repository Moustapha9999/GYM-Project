"""Modèle PlanningCoach — planning des séances de coaching."""
import uuid
from datetime import date, datetime, time

from sqlalchemy import Date, DateTime, ForeignKey, String, Time
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class PlanningCoach(Base):
    __tablename__ = "planning_coachs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    coach_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("employes.id", ondelete="CASCADE"),
        nullable=False,
    )
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    titre: Mapped[str] = mapped_column(String(150), nullable=False)
    date_seance: Mapped[date] = mapped_column(Date, nullable=False)
    heure_debut: Mapped[time] = mapped_column(Time, nullable=False)
    heure_fin: Mapped[time] = mapped_column(Time, nullable=False)
    statut: Mapped[str] = mapped_column(String(20), default="Planifié")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    coach = relationship("Employe", back_populates="plannings")
