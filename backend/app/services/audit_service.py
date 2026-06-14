"""Service du Journal d'audit — enregistrement et consultation des actions."""
import uuid

from sqlalchemy.orm import Session

from app.models.journal_audit import JournalAudit


def enregistrer(
    db: Session,
    utilisateur_id: uuid.UUID | None,
    action: str,
    module: str,
    cible_table: str | None = None,
    cible_id: uuid.UUID | None = None,
    details: dict | None = None,
    adresse_ip: str | None = None,
    user_agent: str | None = None,
) -> None:
    """Enregistre une entrée d'audit (non bloquant)."""
    try:
        entree = JournalAudit(
            utilisateur_id=utilisateur_id,
            action=action,
            module=module,
            cible_table=cible_table,
            cible_id=cible_id,
            details=details,
            adresse_ip=adresse_ip,
            user_agent=user_agent,
        )
        db.add(entree)
        db.commit()
    except Exception:
        db.rollback()


def lister(
    db: Session,
    utilisateur_id: uuid.UUID | None = None,
    module: str | None = None,
    action: str | None = None,
):
    query = db.query(JournalAudit)
    if utilisateur_id:
        query = query.filter(JournalAudit.utilisateur_id == utilisateur_id)
    if module:
        query = query.filter(JournalAudit.module == module)
    if action:
        query = query.filter(JournalAudit.action.ilike(f"%{action}%"))
    return query.order_by(JournalAudit.created_at.desc())
