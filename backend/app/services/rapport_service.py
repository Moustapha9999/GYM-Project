"""Service métier de consolidation des rapports."""
from __future__ import annotations

from datetime import date, datetime, time

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.models.abonnement import Abonnement
from app.models.client import Client
from app.models.employe import Employe
from app.models.fiche_paie import FichePaie
from app.models.journal_audit import JournalAudit
from app.models.journal_caisse import JournalCaisse
from app.models.presence import Presence
from app.models.role import Role
from app.models.utilisateur import Utilisateur


def _daterange_datetime(date_debut: date | None, date_fin: date | None) -> tuple[datetime, datetime] | None:
    if not date_debut and not date_fin:
        return None
    start = datetime.combine(date_debut or date.min, time.min)
    end = datetime.combine(date_fin or date.max, time.max)
    return start, end


def lister_fiches_paie(db: Session, date_debut: date | None = None, date_fin: date | None = None) -> list[dict]:
    query = (
        db.query(FichePaie, Employe)
        .join(Employe, Employe.id == FichePaie.employe_id)
        .order_by(FichePaie.annee.desc(), FichePaie.mois.desc(), FichePaie.created_at.desc())
    )
    if date_debut:
        query = query.filter(FichePaie.created_at >= datetime.combine(date_debut, time.min))
    if date_fin:
        query = query.filter(FichePaie.created_at <= datetime.combine(date_fin, time.max))

    result: list[dict] = []
    for fiche, employe in query.all():
        result.append(
            {
                "id": fiche.id,
                "employe_nom": f"{employe.prenom} {employe.nom}",
                "fonction": employe.fonction,
                "mois": fiche.mois,
                "annee": fiche.annee,
                "salaire_base": fiche.salaire_base,
                "primes": fiche.primes,
                "bonus": fiche.bonus,
                "retenues": fiche.retenues,
                "salaire_final": fiche.salaire_final,
                "statut_paiement": fiche.statut_paiement,
                "date_paiement": fiche.date_paiement,
                "created_at": fiche.created_at,
            }
        )
    return result


def lister_journal_audit(
    db: Session, date_debut: date | None = None, date_fin: date | None = None, module: str | None = None
) -> list[dict]:
    query = (
        db.query(JournalAudit, Utilisateur, Role)
        .outerjoin(Utilisateur, Utilisateur.id == JournalAudit.utilisateur_id)
        .outerjoin(Role, Role.id == Utilisateur.role_id)
        .order_by(JournalAudit.created_at.desc())
    )
    date_range = _daterange_datetime(date_debut, date_fin)
    if date_range:
        query = query.filter(and_(JournalAudit.created_at >= date_range[0], JournalAudit.created_at <= date_range[1]))
    if module:
        query = query.filter(JournalAudit.module.ilike(f"%{module.strip()}%"))

    data: list[dict] = []
    for audit, user, role in query.all():
        data.append(
            {
                "id": audit.id,
                "created_at": audit.created_at,
                "action": audit.action,
                "module": audit.module,
                "cible_table": audit.cible_table,
                "cible_id": audit.cible_id,
                "details": audit.details,
                "adresse_ip": audit.adresse_ip,
                "user_agent": audit.user_agent,
                "utilisateur_nom": f"{user.prenom} {user.nom}" if user else None,
                "role_nom": role.libelle if role else None,
            }
        )
    return data


def lister_journal_caisse(db: Session, date_debut: date | None = None, date_fin: date | None = None) -> list[dict]:
    query = (
        db.query(JournalCaisse, Utilisateur)
        .outerjoin(Utilisateur, Utilisateur.id == JournalCaisse.cloture_par)
        .order_by(JournalCaisse.date_jour.desc())
    )
    if date_debut:
        query = query.filter(JournalCaisse.date_jour >= date_debut)
    if date_fin:
        query = query.filter(JournalCaisse.date_jour <= date_fin)

    rows: list[dict] = []
    for caisse, utilisateur in query.all():
        rows.append(
            {
                "id": caisse.id,
                "date_jour": caisse.date_jour,
                "total_encaisse": caisse.total_encaisse,
                "total_depenses": caisse.total_depenses,
                "solde": caisse.solde,
                "statut": caisse.statut,
                "cloture_le": caisse.cloture_le,
                "cloture_par_nom": f"{utilisateur.prenom} {utilisateur.nom}" if utilisateur else None,
                "created_at": caisse.created_at,
            }
        )
    return rows


def lister_journal_clients(db: Session, date_debut: date | None = None, date_fin: date | None = None) -> list[dict]:
    latest_presence = (
        db.query(Presence.client_id.label("client_id"), func.max(Presence.heure_entree).label("derniere_presence"))
        .group_by(Presence.client_id)
        .subquery()
    )
    latest_abo = (
        db.query(Abonnement.client_id.label("client_id"), func.max(Abonnement.date_fin).label("dernier_abonnement_fin"))
        .group_by(Abonnement.client_id)
        .subquery()
    )

    query = (
        db.query(Client, latest_presence.c.derniere_presence, latest_abo.c.dernier_abonnement_fin)
        .outerjoin(latest_presence, latest_presence.c.client_id == Client.id)
        .outerjoin(latest_abo, latest_abo.c.client_id == Client.id)
        .order_by(Client.created_at.desc())
    )
    if date_debut:
        query = query.filter(Client.created_at >= datetime.combine(date_debut, time.min))
    if date_fin:
        query = query.filter(Client.created_at <= datetime.combine(date_fin, time.max))

    result: list[dict] = []
    for client, derniere_presence, dernier_abonnement_fin in query.all():
        result.append(
            {
                "id": client.id,
                "numero_membre": client.numero_membre,
                "nom": client.nom,
                "prenom": client.prenom,
                "telephone": client.telephone,
                "email": client.email,
                "actif": client.actif,
                "created_at": client.created_at,
                "derniere_presence": derniere_presence,
                "dernier_abonnement_fin": dernier_abonnement_fin,
            }
        )
    return result
