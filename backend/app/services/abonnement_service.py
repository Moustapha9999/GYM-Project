"""
Service métier du module Abonnements.

Logique TOTAL FITNESS :
- Tarif inscription (1er abonnement) vs renouvellement
- Type choisi automatiquement selon le sexe du client
- Calcul des dates avec chaînage si renouvellement anticipé
- Règle du délai de grâce (3 jours)
- Création abonnement + paiement + carte QR dans une transaction
"""
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.abonnement import Abonnement
from app.models.carte_membre import CarteMembre
from app.models.client import Client
from app.models.paiement import Paiement
from app.models.parametre_systeme import ParametreSysteme
from app.models.type_abonnement import TypeAbonnement
from app.schemas.abonnement import AbonnementUpdate
from app.services import carte_qr_service


class AbonnementError(Exception):
    """Erreur métier lors de la gestion d'un abonnement."""


def _get_param_int(db: Session, cle: str, defaut: int) -> int:
    p = db.query(ParametreSysteme).filter(ParametreSysteme.cle == cle).first()
    if p and p.valeur and p.valeur.isdigit():
        return int(p.valeur)
    return defaut


def get_delai_grace_jours(db: Session) -> int:
    return _get_param_int(db, "delai_grace_jours", 3)


def _generer_reference_paiement() -> str:
    horodatage = datetime.now(timezone.utc).strftime("%Y%m")
    suffixe = uuid.uuid4().hex[:8]
    return f"PAY-{horodatage}-{suffixe}"


def souscrire(
    db: Session,
    client_id: uuid.UUID,
    moyen_paiement_id: uuid.UUID,
    encaisse_par: uuid.UUID,
) -> dict:
    """
    Crée (ou renouvelle) un abonnement pour un client.
    Détermine automatiquement le type selon le sexe, applique le bon tarif,
    crée le paiement et génère la carte QR. Le tout en transaction.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if client is None:
        raise AbonnementError("Client introuvable.")

    if not client.sexe:
        raise AbonnementError(
            "Le sexe du client doit être renseigné avant de créer un abonnement."
        )

    # ── Type d'abonnement selon le sexe ─────────────────────
    type_abo = (
        db.query(TypeAbonnement)
        .filter(TypeAbonnement.sexe == client.sexe, TypeAbonnement.actif == True)  # noqa: E712
        .first()
    )
    if type_abo is None:
        raise AbonnementError(
            f"Aucun type d'abonnement actif pour le sexe '{client.sexe}'."
        )

    # ── Déterminer si c'est une 1ère inscription ────────────
    abo_anterieur = (
        db.query(Abonnement)
        .filter(Abonnement.client_id == client_id)
        .order_by(Abonnement.date_fin.desc())
        .first()
    )
    est_inscription = abo_anterieur is None

    # ── Tarif applicable ────────────────────────────────────
    if est_inscription:
        montant = type_abo.montant_inscription
        type_tarif = "inscription"
    else:
        montant = type_abo.montant
        type_tarif = "renouvellement"

    # ── Calcul des dates ────────────────────────────────────
    abo_actif = (
        db.query(Abonnement)
        .filter(Abonnement.client_id == client_id, Abonnement.statut == "Actif")
        .order_by(Abonnement.date_fin.desc())
        .first()
    )

    aujourdhui = date.today()
    if abo_actif and abo_actif.date_fin >= aujourdhui:
        # Renouvellement anticipé : on chaîne après la fin actuelle
        date_debut = abo_actif.date_fin + timedelta(days=1)
    else:
        date_debut = aujourdhui

    date_fin = date_debut + timedelta(days=type_abo.duree_jours)

    try:
        # ── Clôturer l'ancien abonnement actif ──────────────
        if abo_actif:
            abo_actif.statut = "Résilié"

        # ── Créer le nouvel abonnement ──────────────────────
        abonnement = Abonnement(
            client_id=client_id,
            type_abonnement_id=type_abo.id,
            date_debut=date_debut,
            date_fin=date_fin,
            montant=montant,
            statut="Actif",
            est_inscription=est_inscription,
            renouvele_de=abo_actif.id if abo_actif else None,
            created_by=encaisse_par,
        )
        db.add(abonnement)
        db.flush()

        # ── Créer le paiement ───────────────────────────────
        reference = _generer_reference_paiement()
        paiement = Paiement(
            reference=reference,
            client_id=client_id,
            abonnement_id=abonnement.id,
            type_paiement="Abonnement",
            montant=montant,
            moyen_paiement_id=moyen_paiement_id,
            statut="Validé",
            encaisse_par=encaisse_par,
        )
        db.add(paiement)

        # ── Générer la carte QR ─────────────────────────────
        carte = carte_qr_service.generer_ou_renouveler_carte(
            db, client_id, abonnement.id, date_fin
        )

        db.commit()
        db.refresh(abonnement)
        db.refresh(carte)

        return {
            "abonnement": abonnement,
            "carte": carte,
            "paiement_reference": reference,
            "montant_paye": montant,
            "type_tarif": type_tarif,
        }

    except Exception:
        db.rollback()
        raise


def lister(db: Session, client_id: uuid.UUID | None = None, statut: str | None = None):
    from sqlalchemy.orm import joinedload

    query = db.query(Abonnement).options(
        joinedload(Abonnement.client),
        joinedload(Abonnement.type_abonnement),
    )
    if client_id:
        query = query.filter(Abonnement.client_id == client_id)
    if statut:
        query = query.filter(Abonnement.statut == statut)
    return query.order_by(Abonnement.created_at.desc())


def lister_types(db: Session):
    return (
        db.query(TypeAbonnement)
        .filter(TypeAbonnement.actif == True)  # noqa: E712
        .order_by(TypeAbonnement.nom)
        .all()
    )


def obtenir(db: Session, abonnement_id: uuid.UUID) -> Abonnement | None:
    return db.query(Abonnement).filter(Abonnement.id == abonnement_id).first()


def abonnement_actuel(db: Session, client_id: uuid.UUID) -> Abonnement | None:
    """Retourne l'abonnement le plus récent du client (actif ou expiré)."""
    return (
        db.query(Abonnement)
        .filter(Abonnement.client_id == client_id)
        .order_by(Abonnement.date_fin.desc())
        .first()
    )


def peut_renouveler_au_tarif_normal(db: Session, client_id: uuid.UUID) -> dict:
    """
    Applique la règle des 3 jours.
    Retourne un dict explicatif : si l'abonnement est expiré depuis plus
    que le délai de grâce, le client doit passer par une séance journalière.
    """
    delai_grace = get_delai_grace_jours(db)
    abo = abonnement_actuel(db, client_id)

    if abo is None:
        return {"premiere_inscription": True, "tarif_normal": True, "jours_retard": 0}

    aujourdhui = date.today()
    if abo.date_fin >= aujourdhui:
        return {"premiere_inscription": False, "tarif_normal": True, "jours_retard": 0}

    jours_retard = (aujourdhui - abo.date_fin).days
    return {
        "premiere_inscription": False,
        "tarif_normal": jours_retard <= delai_grace,
        "jours_retard": jours_retard,
        "delai_grace": delai_grace,
    }


def suspendre(db: Session, abonnement: Abonnement) -> Abonnement:
    abonnement.statut = "Suspendu"
    carte_qr_service.desactiver_cartes_abonnement(db, abonnement)
    db.commit()
    db.refresh(abonnement)
    return abonnement


def resilier(db: Session, abonnement: Abonnement) -> Abonnement:
    abonnement.statut = "Résilié"
    carte_qr_service.desactiver_cartes_abonnement(db, abonnement)
    db.commit()
    db.refresh(abonnement)
    return abonnement


def modifier(db: Session, abonnement: Abonnement, payload: AbonnementUpdate) -> Abonnement:
    """Met à jour un abonnement."""
    data = payload.model_dump(exclude_unset=True)

    for champ, valeur in data.items():
        setattr(abonnement, champ, valeur)

    if "statut" in data and data["statut"] in carte_qr_service.STATUTS_ABONNEMENT_INACTIFS:
        carte_qr_service.desactiver_cartes_abonnement(db, abonnement)

    if "date_fin" in data:
        db.query(CarteMembre).filter(
            CarteMembre.abonnement_id == abonnement.id,
            CarteMembre.statut == "Actif",
        ).update({"date_expiration": abonnement.date_fin}, synchronize_session=False)

    db.commit()
    db.refresh(abonnement)
    return abonnement


def supprimer(db: Session, abonnement: Abonnement) -> None:
    """Supprime définitivement un abonnement et ses données liées directes."""
    abo_id = abonnement.id

    db.query(Paiement).filter(Paiement.abonnement_id == abo_id).delete(
        synchronize_session=False
    )
    db.query(CarteMembre).filter(CarteMembre.abonnement_id == abo_id).delete(
        synchronize_session=False
    )
    db.query(Abonnement).filter(Abonnement.renouvele_de == abo_id).update(
        {"renouvele_de": None},
        synchronize_session=False,
    )
    db.delete(abonnement)
    db.commit()
