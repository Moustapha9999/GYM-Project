"""Modèle Notification — notifications WhatsApp + SMS de secours."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    destinataire_type: Mapped[str] = mapped_column(String(20), nullable=False)
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clients.id"), nullable=True
    )
    employe_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employes.id"), nullable=True
    )
    numero_telephone: Mapped[str] = mapped_column(String(20), nullable=False)
    canal: Mapped[str] = mapped_column(String(10), nullable=False, default="whatsapp")
    type_notification: Mapped[str] = mapped_column(String(50), nullable=False)
    message: Mapped[str] = mapped_column(String, nullable=False)
    statut: Mapped[str] = mapped_column(String(20), default="En attente")
    provider_message_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fallback_sms_envoye: Mapped[bool] = mapped_column(Boolean, default=False)
    date_envoi: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
