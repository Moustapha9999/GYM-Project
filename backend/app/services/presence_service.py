"""
Service métier du module Présences.

- Entrée par QR (scan carte) ou manuelle (client_id)
- Vérification de l'abonnement à l'entrée (règle des 3 jours) : entrée bloquée
  si abonnement expiré au-delà du délai de grâce
- Sortie par presence_id ou re-scan QR, avec calcul automatique de la durée
"""
import uuid
from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.models.abonnement import Abonnement
from app.models.carte_membre import CarteMembre
from app.models.client import Client
from app.models.parametre_systeme import ParametreSysteme
from app.models.presence import Presence


class PresenceError(Exception):
    """Erreur métier lors d'un pointage."""


def _get_param_int(db: Session, cle: str, defaut: int) -> int:
    p = db.query(ParametreSysteme).filter(ParametreSysteme.cle == cle).first()
    if p and p.valeur and p.valeur.isdigit():
        return int(p.valeur)
    return defaut


def _verifier_acces(db: Session, client_id: uuid.UUID) -> None:
    """
    Vérifie que le client peut entrer (abonnement valide ou dans le délai de grâce).
    Lève PresenceError si l'accès doit être bloqué.
    """
    abo = (
        db.query(Abonnement)
        .filter(Abonnement.client_id == client_id)
        .order_by(Abonnement.date_fin.desc())
        .first()
    )

    if abo is None:
        raise PresenceError(
            "Ce client n'a aucun abonnement. Il doit souscrire ou payer une séance journalière."
        )

    if abo.statut in ("Suspendu", "Résilié"):
        raise PresenceError(f"Abonnement {abo.statut.lower()}. Accès refusé.")

    aujourdhui = date.today()

    # Abonnement encore valide
    if abo.statut == "Actif" and abo.date_fin >= aujourdhui:
        return

    # Abonnement expiré : vérifier le délai de grâce
    delai_grace = _get_param_int(db, "delai_grace_jours", 3)
    jours_retard = (aujourdhui - abo.date_fin).days

    if jours_retard <= delai_grace:
        return  # toléré

    raise PresenceError(
        f"Accès refusé : abonnement expiré depuis {jours_retard} jours "
        f"(délai de grâce {delai_grace} jours dépassé). "
        f"Le client doit renouveler ou payer une séance journalière (50 MRU)."
    )


def pointer_entree_manuelle(
    db: Session, client_id: uuid.UUID, enregistre_par: uuid.UUID
) -> Presence:
    client = db.query(Client).filter(Client.id == client_id).first()
    if client is None:
        raise PresenceError("Client introuvable.")

    _verifier_acces(db, client_id)
    return _creer_entree(db, client_id, "Manuel", enregistre_par)


def pointer_entree_qr(
    db: Session, qr_code_uuid: uuid.UUID, enregistre_par: uuid.UUID
) -> Presence:
    carte = (
        db.query(CarteMembre)
        .filter(CarteMembre.qr_code_uuid == qr_code_uuid)
        .first()
    )
    if carte is None:
        raise PresenceError("Carte QR inconnue.")
    if carte.statut != "Actif":
        raise PresenceError(f"Carte QR {carte.statut.lower()}. Accès refusé.")

    _verifier_acces(db, carte.client_id)
    return _creer_entree(db, carte.client_id, "QR Code", enregistre_par)


def _creer_entree(
    db: Session, client_id: uuid.UUID, methode: str, enregistre_par: uuid.UUID
) -> Presence:
    # Empêcher un double pointage : déjà présent (entrée sans sortie) ?
    en_cours = (
        db.query(Presence)
        .filter(Presence.client_id == client_id, Presence.heure_sortie.is_(None))
        .first()
    )
    if en_cours:
        raise PresenceError("Ce client est déjà présent (entrée sans sortie).")

    presence = Presence(
        client_id=client_id,
        methode=methode,
        heure_entree=datetime.now(timezone.utc),
        enregistre_par=enregistre_par,
    )
    db.add(presence)
    db.commit()
    db.refresh(presence)
    return presence


def pointer_sortie(
    db: Session,
    presence_id: uuid.UUID | None = None,
    qr_code_uuid: uuid.UUID | None = None,
) -> Presence:
    presence = None

    if presence_id:
        presence = db.query(Presence).filter(Presence.id == presence_id).first()
    elif qr_code_uuid:
        carte = (
            db.query(CarteMembre)
            .filter(CarteMembre.qr_code_uuid == qr_code_uuid)
            .first()
        )
        if carte is None:
            raise PresenceError("Carte QR inconnue.")
        # Trouver la présence en cours de ce client
        presence = (
            db.query(Presence)
            .filter(
                Presence.client_id == carte.client_id,
                Presence.heure_sortie.is_(None),
            )
            .order_by(Presence.heure_entree.desc())
            .first()
        )

    if presence is None:
        raise PresenceError("Aucune présence en cours trouvée.")
    if presence.heure_sortie is not None:
        raise PresenceError("Sortie déjà enregistrée.")

    sortie = datetime.now(timezone.utc)
    presence.heure_sortie = sortie
    # Calcul de la durée en minutes
    entree = presence.heure_entree
    if entree.tzinfo is None:
        entree = entree.replace(tzinfo=timezone.utc)
    presence.duree_minutes = int((sortie - entree).total_seconds() // 60)

    db.commit()
    db.refresh(presence)
    return presence


def lister_du_jour(db: Session, jour: date | None = None):
    """Présences d'un jour donné (défaut : aujourd'hui), enrichies avec le client."""
    if jour is None:
        jour = date.today()

    resultats = (
        db.query(Presence, Client)
        .join(Client, Presence.client_id == Client.id)
        .filter(Presence.heure_entree >= datetime(jour.year, jour.month, jour.day, tzinfo=timezone.utc))
        .order_by(Presence.heure_entree.desc())
        .all()
    )

    return [
        {
            "id": p.id,
            "client_id": c.id,
            "client_nom": c.nom,
            "client_prenom": c.prenom,
            "numero_membre": c.numero_membre,
            "methode": p.methode,
            "heure_entree": p.heure_entree,
            "heure_sortie": p.heure_sortie,
            "duree_minutes": p.duree_minutes,
        }
        for p, c in resultats
    ]
