"""Modèle Employe — personnel de la salle."""
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Employe(Base):
    __tablename__ = "employes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    utilisateur_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("utilisateurs.id"), nullable=True
    )
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenom: Mapped[str] = mapped_column(String(100), nullable=False)
    fonction: Mapped[str] = mapped_column(String(50), nullable=False)
    telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    adresse: Mapped[str | None] = mapped_column(String, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    date_embauche: Mapped[date] = mapped_column(Date, nullable=False)
    type_contrat: Mapped[str | None] = mapped_column(String(30), nullable=True)
    salaire_base: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    statut: Mapped[str] = mapped_column(String(20), nullable=False, default="Actif")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relations
    utilisateur = relationship("Utilisateur", foreign_keys=[utilisateur_id])
    fiches_paie = relationship("FichePaie", back_populates="employe")
    programmes = relationship("ProgrammeSportif", back_populates="coach")
    plannings = relationship("PlanningCoach", back_populates="coach")
