"""Écriture dans le journal d'audit."""
import uuid

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.journal_audit import JournalAudit


def _extract_request_meta(request: Request | None) -> tuple[str | None, str | None]:
    if request is None:
        return None, None
    ip = request.client.host if request.client else None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    return ip, request.headers.get("user-agent")


def enregistrer(
    db: Session,
    *,
    utilisateur_id: uuid.UUID | None,
    action: str,
    module: str,
    cible_table: str | None = None,
    cible_id: uuid.UUID | None = None,
    details: dict | None = None,
    request: Request | None = None,
) -> None:
    """Ajoute une entrée d'audit (le commit est laissé à l'appelant)."""
    ip, user_agent = _extract_request_meta(request)
    db.add(
        JournalAudit(
            utilisateur_id=utilisateur_id,
            action=action,
            module=module,
            cible_table=cible_table,
            cible_id=cible_id,
            details=details,
            adresse_ip=ip,
            user_agent=user_agent,
        )
    )
