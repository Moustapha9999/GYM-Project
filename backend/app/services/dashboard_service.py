"""Service d'agrégation des KPIs pour les 3 dashboards."""
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.abonnement import Abonnement
from app.models.client import Client
from app.models.depense import Depense
from app.models.employe import Employe
from app.models.paiement import Paiement
from app.models.planning_coach import PlanningCoach
from app.models.presence import Presence
from app.models.programme_sportif import ProgrammeSportif
from app.models.role import Role
from app.models.seance_journaliere import SeanceJournaliere
from app.models.utilisateur import Utilisateur


def _bornes_jour(jour: date):
    debut = datetime(jour.year, jour.month, jour.day, 0, 0, 0, tzinfo=timezone.utc)
    fin = datetime(jour.year, jour.month, jour.day, 23, 59, 59, tzinfo=timezone.utc)
    return debut, fin


def _bornes_mois(jour: date):
    debut = datetime(jour.year, jour.month, 1, 0, 0, 0, tzinfo=timezone.utc)
    return debut, datetime.now(timezone.utc)


# ────────────────────────────────────────────────────────────
# DASHBOARD ADMIN / PDG
# ────────────────────────────────────────────────────────────
def dashboard_admin(db: Session) -> dict:
    auj = date.today()
    debut_jour, fin_jour = _bornes_jour(auj)
    debut_mois, maintenant = _bornes_mois(auj)

    def somme_paiements(debut, fin, type_p=None):
        q = db.query(func.coalesce(func.sum(Paiement.montant), 0)).filter(
            Paiement.date_paiement >= debut,
            Paiement.date_paiement <= fin,
            Paiement.statut == "Validé",
        )
        if type_p:
            q = q.filter(Paiement.type_paiement == type_p)
        return Decimal(str(q.scalar()))

    revenus_jour = somme_paiements(debut_jour, fin_jour)
    revenus_mois = somme_paiements(debut_mois, maintenant)
    total_abos = somme_paiements(debut_mois, maintenant, "Abonnement")
    total_seances = somme_paiements(debut_mois, maintenant, "Séance journalière")

    total_depenses = Decimal(str(
        db.query(func.coalesce(func.sum(Depense.montant), 0))
        .filter(Depense.date_depense >= debut_mois.date())
        .scalar()
    ))

    clients_actifs = db.query(func.count(Client.id)).filter(Client.actif == True).scalar()  # noqa: E712
    abos_actifs = db.query(func.count(Abonnement.id)).filter(
        Abonnement.statut == "Actif", Abonnement.date_fin >= auj
    ).scalar()

    dans_7j = auj + timedelta(days=7)
    expirant = db.query(func.count(Abonnement.id)).filter(
        Abonnement.statut == "Actif",
        Abonnement.date_fin >= auj,
        Abonnement.date_fin <= dans_7j,
    ).scalar()

    nouvelles_inscriptions = db.query(func.count(Abonnement.id)).filter(
        Abonnement.est_inscription == True,  # noqa: E712
        Abonnement.created_at >= debut_mois,
    ).scalar()

    presences_jour = db.query(func.count(Presence.id)).filter(
        Presence.heure_entree >= debut_jour, Presence.heure_entree <= fin_jour
    ).scalar()

    # Revenus des 7 derniers jours
    revenus_7j = []
    for i in range(6, -1, -1):
        j = auj - timedelta(days=i)
        d, f = _bornes_jour(j)
        montant = somme_paiements(d, f)
        revenus_7j.append({"label": j.strftime("%d/%m"), "valeur": montant})

    # Répartition abonnements actifs par sexe
    repartition = (
        db.query(Client.sexe, func.count(Abonnement.id))
        .join(Client, Abonnement.client_id == Client.id)
        .filter(Abonnement.statut == "Actif", Abonnement.date_fin >= auj)
        .group_by(Client.sexe)
        .all()
    )
    repartition_sexe = [
        {"label": sexe or "Non précisé", "valeur": nb} for sexe, nb in repartition
    ]

    return {
        "revenus_jour": revenus_jour,
        "revenus_mois": revenus_mois,
        "total_abonnements_mois": total_abos,
        "total_seances_mois": total_seances,
        "total_depenses_mois": total_depenses,
        "benefice_mois": revenus_mois - total_depenses,
        "clients_actifs": clients_actifs,
        "abonnements_actifs": abos_actifs,
        "abonnements_expirant_7j": expirant,
        "nouvelles_inscriptions_mois": nouvelles_inscriptions,
        "presences_jour": presences_jour,
        "revenus_7_derniers_jours": revenus_7j,
        "repartition_abonnements_sexe": repartition_sexe,
    }


# ────────────────────────────────────────────────────────────
# DASHBOARD RÉCEPTION
# ────────────────────────────────────────────────────────────
def dashboard_reception(db: Session) -> dict:
    auj = date.today()
    debut_jour, fin_jour = _bornes_jour(auj)

    revenus_jour = Decimal(str(
        db.query(func.coalesce(func.sum(Paiement.montant), 0)).filter(
            Paiement.date_paiement >= debut_jour,
            Paiement.date_paiement <= fin_jour,
            Paiement.statut == "Validé",
        ).scalar()
    ))
    nb_paiements = db.query(func.count(Paiement.id)).filter(
        Paiement.date_paiement >= debut_jour, Paiement.date_paiement <= fin_jour
    ).scalar()

    presences_jour = db.query(func.count(Presence.id)).filter(
        Presence.heure_entree >= debut_jour, Presence.heure_entree <= fin_jour
    ).scalar()
    presents = db.query(func.count(Presence.id)).filter(
        Presence.heure_sortie.is_(None)
    ).scalar()

    seances_jour = db.query(func.count(SeanceJournaliere.id)).filter(
        SeanceJournaliere.date_seance == auj
    ).scalar()

    abos_jour = db.query(func.count(Abonnement.id)).filter(
        Abonnement.created_at >= debut_jour, Abonnement.created_at <= fin_jour
    ).scalar()

    dans_7j = auj + timedelta(days=7)
    expirant = db.query(func.count(Abonnement.id)).filter(
        Abonnement.statut == "Actif",
        Abonnement.date_fin >= auj,
        Abonnement.date_fin <= dans_7j,
    ).scalar()

    return {
        "revenus_jour": revenus_jour,
        "nombre_paiements_jour": nb_paiements,
        "presences_jour": presences_jour,
        "presents_actuellement": presents,
        "seances_jour": seances_jour,
        "abonnements_souscrits_jour": abos_jour,
        "abonnements_expirant_7j": expirant,
    }


# ────────────────────────────────────────────────────────────
# DASHBOARD COACH
# ────────────────────────────────────────────────────────────
def dashboard_coach(db: Session, coach_employe_id: uuid.UUID | None = None) -> dict:
    auj = date.today()

    q_prog = db.query(func.count(ProgrammeSportif.id)).filter(
        ProgrammeSportif.actif == True  # noqa: E712
    )
    q_jour = db.query(func.count(PlanningCoach.id)).filter(
        PlanningCoach.date_seance == auj
    )
    debut_sem = auj - timedelta(days=auj.weekday())
    fin_sem = debut_sem + timedelta(days=6)
    q_sem = db.query(func.count(PlanningCoach.id)).filter(
        PlanningCoach.date_seance >= debut_sem, PlanningCoach.date_seance <= fin_sem
    )
    q_clients = db.query(func.count(func.distinct(ProgrammeSportif.client_id))).filter(
        ProgrammeSportif.actif == True  # noqa: E712
    )

    # Si coach spécifique, filtrer
    if coach_employe_id:
        q_prog = q_prog.filter(ProgrammeSportif.coach_id == coach_employe_id)
        q_jour = q_jour.filter(PlanningCoach.coach_id == coach_employe_id)
        q_sem = q_sem.filter(PlanningCoach.coach_id == coach_employe_id)
        q_clients = q_clients.filter(ProgrammeSportif.coach_id == coach_employe_id)

    return {
        "programmes_actifs": q_prog.scalar(),
        "seances_planifiees_jour": q_jour.scalar(),
        "seances_planifiees_semaine": q_sem.scalar(),
        "clients_suivis": q_clients.scalar(),
    }


# ────────────────────────────────────────────────────────────
# ALERTES / NOTIFICATIONS IN-APP
# ────────────────────────────────────────────────────────────
def _format_auteur(utilisateur: Utilisateur | None, role: Role | None) -> str | None:
    if utilisateur is None:
        return None
    nom = f"{utilisateur.prenom} {utilisateur.nom}".strip()
    if role is not None:
        return f"{nom} ({role.libelle})"
    return nom


def alertes(db: Session, limit: int = 30) -> dict:
    """Agrège les alertes métier pour le centre de notifications."""
    auj = date.today()
    dans_7j = auj + timedelta(days=7)
    debut_jour, fin_jour = _bornes_jour(auj)
    depuis_7j = datetime.now(timezone.utc) - timedelta(days=7)
    items: list[dict] = []

    abos_expirant = (
        db.query(Abonnement, Client)
        .join(Client, Abonnement.client_id == Client.id)
        .filter(
            Abonnement.statut == "Actif",
            Abonnement.date_fin >= auj,
            Abonnement.date_fin <= dans_7j,
        )
        .order_by(Abonnement.date_fin.asc())
        .limit(15)
        .all()
    )
    for abo, client in abos_expirant:
        jours = (abo.date_fin - auj).days
        if jours == 0:
            msg = f"{client.prenom} {client.nom} — expire aujourd'hui"
            severity = "danger"
        elif jours <= 3:
            msg = f"{client.prenom} {client.nom} — expire dans {jours} jour(s)"
            severity = "warning"
        else:
            msg = f"{client.prenom} {client.nom} — expire le {abo.date_fin.strftime('%d/%m/%Y')}"
            severity = "warning"
        items.append({
            "id": f"abo-exp-{abo.id}",
            "type": "abonnement_expiration",
            "severity": severity,
            "titre": "Abonnement bientôt expiré",
            "message": msg,
            "route": "/abonnements",
            "entity_id": str(abo.id),
            "created_at": datetime.combine(abo.date_fin, datetime.min.time(), tzinfo=timezone.utc),
        })

    abos_expires = (
        db.query(Abonnement, Client)
        .join(Client, Abonnement.client_id == Client.id)
        .filter(Abonnement.statut == "Actif", Abonnement.date_fin < auj)
        .order_by(Abonnement.date_fin.desc())
        .limit(10)
        .all()
    )
    for abo, client in abos_expires:
        retard = (auj - abo.date_fin).days
        items.append({
            "id": f"abo-late-{abo.id}",
            "type": "abonnement_expire",
            "severity": "danger",
            "titre": "Abonnement expiré",
            "message": f"{client.prenom} {client.nom} — expiré depuis {retard} jour(s)",
            "route": "/abonnements",
            "entity_id": str(abo.id),
            "created_at": datetime.combine(abo.date_fin, datetime.min.time(), tzinfo=timezone.utc),
        })

    nouveaux_clients = (
        db.query(Client, Utilisateur, Role)
        .outerjoin(Utilisateur, Client.created_by == Utilisateur.id)
        .outerjoin(Role, Utilisateur.role_id == Role.id)
        .filter(Client.created_at >= depuis_7j)
        .order_by(Client.created_at.desc())
        .limit(10)
        .all()
    )
    for client, auteur, role in nouveaux_clients:
        auteur_label = _format_auteur(auteur, role)
        suffix = f" — par {auteur_label}" if auteur_label else ""
        items.append({
            "id": f"client-new-{client.id}",
            "type": "nouveau_client",
            "severity": "info",
            "titre": "Nouveau client",
            "message": f"{client.prenom} {client.nom} (N° {client.numero_membre}){suffix}",
            "route": "/clients",
            "entity_id": str(client.id),
            "created_at": client.created_at,
        })

    nouveaux_abos = (
        db.query(Abonnement, Client, Utilisateur, Role)
        .join(Client, Abonnement.client_id == Client.id)
        .outerjoin(Utilisateur, Abonnement.created_by == Utilisateur.id)
        .outerjoin(Role, Utilisateur.role_id == Role.id)
        .filter(Abonnement.created_at >= debut_jour, Abonnement.created_at <= fin_jour)
        .order_by(Abonnement.created_at.desc())
        .limit(10)
        .all()
    )
    for abo, client, auteur, role in nouveaux_abos:
        auteur_label = _format_auteur(auteur, role)
        suffix = f" — par {auteur_label}" if auteur_label else ""
        items.append({
            "id": f"abo-new-{abo.id}",
            "type": "nouvel_abonnement",
            "severity": "info",
            "titre": "Nouvel abonnement",
            "message": f"{client.prenom} {client.nom} — souscrit aujourd'hui{suffix}",
            "route": "/abonnements",
            "entity_id": str(abo.id),
            "created_at": abo.created_at,
        })

    nouveaux_paiements = (
        db.query(Paiement, Client)
        .outerjoin(Client, Paiement.client_id == Client.id)
        .filter(
            Paiement.date_paiement >= debut_jour,
            Paiement.date_paiement <= fin_jour,
            Paiement.statut == "Validé",
        )
        .order_by(Paiement.date_paiement.desc())
        .limit(8)
        .all()
    )
    for paiement, client in nouveaux_paiements:
        client_nom = f"{client.prenom} {client.nom}" if client else "Client occasionnel"
        items.append({
            "id": f"pay-new-{paiement.id}",
            "type": "nouveau_paiement",
            "severity": "info",
            "titre": "Paiement encaissé",
            "message": f"{paiement.reference} — {client_nom} — {paiement.montant} MRU",
            "route": "/paiements",
            "entity_id": str(paiement.id),
            "created_at": paiement.date_paiement,
        })

    items.sort(key=lambda item: item["created_at"], reverse=True)
    limited = items[:limit]
    return {"total": len(limited), "items": limited}
