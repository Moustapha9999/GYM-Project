"""Service de génération de cartes QR pour les membres."""
import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models.carte_membre import CarteMembre


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
    # Révoquer les cartes actives existantes
    db.query(CarteMembre).filter(
        CarteMembre.client_id == client_id,
        CarteMembre.statut == "Actif",
    ).update({"statut": "Révoqué"})

    carte = CarteMembre(
        client_id=client_id,
        abonnement_id=abonnement_id,
        qr_code_uuid=uuid.uuid4(),
        date_expiration=date_expiration,
        statut="Actif",
    )
    db.add(carte)
    db.flush()  # pour récupérer l'id sans commit (transaction gérée par l'appelant)
    return carte
