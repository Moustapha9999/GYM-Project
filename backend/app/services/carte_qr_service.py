"""Service de génération de cartes QR pour les membres."""
import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models.abonnement import Abonnement
from app.models.carte_membre import CarteMembre

STATUTS_ABONNEMENT_INACTIFS = ("Suspendu", "Résilié", "Expiré")


def generer_ou_renouveler_carte(
    db: Session,
    client_id: uuid.UUID,
    abonnement_id: uuid.UUID,
    date_expiration: date,
) -> CarteMembre:
    """
    Révoque l'ancienne carte active du client et en génère une nouvelle.
    L'image QR sera générée/uploadée par le frontend ou un service dédié ;
    ici on crée l'enregistrement avec un qr_code_uuid unique.
    """
    db.query(CarteMembre).filter(
        CarteMembre.client_id == client_id,
        CarteMembre.statut == "Actif",
    ).update({"statut": "Révoqué"}, synchronize_session=False)

    carte = CarteMembre(
        client_id=client_id,
        abonnement_id=abonnement_id,
        qr_code_uuid=uuid.uuid4(),
        date_expiration=date_expiration,
        statut="Actif",
    )
    db.add(carte)
    db.flush()
    return carte


def desactiver_cartes_abonnement(db: Session, abonnement: Abonnement) -> int:
    """
    Révoque les cartes actives lors d'une suspension / résiliation.
    Cible l'abonnement concerné et, si le client n'a plus d'autre abonnement
    actif, toutes ses cartes actives restantes.
    """
    count = (
        db.query(CarteMembre)
        .filter(
            CarteMembre.abonnement_id == abonnement.id,
            CarteMembre.statut == "Actif",
        )
        .update({"statut": "Révoqué"}, synchronize_session=False)
    )

    autre_abo_actif = (
        db.query(Abonnement.id)
        .filter(
            Abonnement.client_id == abonnement.client_id,
            Abonnement.statut == "Actif",
            Abonnement.id != abonnement.id,
        )
        .first()
    )

    if not autre_abo_actif:
        count += (
            db.query(CarteMembre)
            .filter(
                CarteMembre.client_id == abonnement.client_id,
                CarteMembre.statut == "Actif",
            )
            .update({"statut": "Révoqué"}, synchronize_session=False)
        )

    return count


def synchroniser_cartes_abonnements_inactifs(db: Session) -> int:
    """
    Révoque les cartes encore « Actif » alors que l'abonnement lié est
    suspendu, résilié ou expiré (corrige les données historiques).
    """
    carte_ids = [
        row[0]
        for row in db.query(CarteMembre.id)
        .join(Abonnement, CarteMembre.abonnement_id == Abonnement.id)
        .filter(
            CarteMembre.statut == "Actif",
            Abonnement.statut.in_(STATUTS_ABONNEMENT_INACTIFS),
        )
        .all()
    ]

    if not carte_ids:
        return 0

    count = (
        db.query(CarteMembre)
        .filter(CarteMembre.id.in_(carte_ids))
        .update({"statut": "Révoqué"}, synchronize_session=False)
    )
    db.flush()
    return count
