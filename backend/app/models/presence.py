"""Modèle Presence — pointage entrée/sortie des clients."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Presence(Base):
    __tablename__ = "presences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id", ondelete="CASCADE"), nullable=False
    )
    methode: Mapped[str] = mapped_column(String(20), nullable=False, default="Manuel")
    heure_entree: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    heure_sortie: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duree_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    enregistre_par: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("utilisateurs.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relations
    client = relationship("Client", back_populates="presences")
