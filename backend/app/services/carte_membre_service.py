"""Service métier du module Cartes membres."""
import uuid

from sqlalchemy.orm import Session, joinedload

from app.models.abonnement import Abonnement
from app.models.carte_membre import CarteMembre
from app.models.client import Client
from app.services import carte_qr_service, parametre_service


def lister(
    db: Session,
    statut: str | None = None,
    search: str | None = None,
):
    """Retourne une requête filtrée des cartes membres (clients inscrits avec abonnement)."""
    carte_qr_service.synchroniser_cartes_abonnements_inactifs(db)
    db.commit()

    query = (
        db.query(CarteMembre)
        .join(Client, CarteMembre.client_id == Client.id)
        .outerjoin(Abonnement, CarteMembre.abonnement_id == Abonnement.id)
        .options(
            joinedload(CarteMembre.client),
            joinedload(CarteMembre.abonnement).joinedload(Abonnement.type_abonnement),
        )
        .filter(Abonnement.id.isnot(None))
    )

    if statut:
        query = query.filter(CarteMembre.statut == statut)

    if search:
        terme = f"%{search}%"
        query = query.filter(
            (Client.nom.ilike(terme))
            | (Client.prenom.ilike(terme))
            | (Client.numero_membre.ilike(terme))
            | (Client.telephone.ilike(terme))
        )

    return query.order_by(CarteMembre.date_generation.desc())


def obtenir(db: Session, carte_id: uuid.UUID) -> CarteMembre | None:
    return (
        db.query(CarteMembre)
        .options(
            joinedload(CarteMembre.client),
            joinedload(CarteMembre.abonnement).joinedload(Abonnement.type_abonnement),
        )
        .filter(CarteMembre.id == carte_id)
        .first()
    )


def to_list_item(carte: CarteMembre) -> dict:
    client = carte.client
    type_nom = None
    if carte.abonnement and carte.abonnement.type_abonnement:
        type_nom = carte.abonnement.type_abonnement.nom

    return {
        "id": carte.id,
        "client_id": carte.client_id,
        "abonnement_id": carte.abonnement_id,
        "qr_code_uuid": carte.qr_code_uuid,
        "date_generation": carte.date_generation,
        "date_expiration": carte.date_expiration,
        "statut": carte.statut,
        "client_numero": client.numero_membre,
        "client_nom": client.nom,
        "client_prenom": client.prenom,
        "client_telephone": client.telephone,
        "client_whatsapp": client.whatsapp,
        "client_photo_url": client.photo_url,
        "type_abonnement": type_nom,
    }


def construire_donnees_pdf(db: Session, carte: CarteMembre) -> dict:
    """Prépare le dict pour la génération PDF de la carte membre."""
    client = carte.client
    settings = parametre_service.lire_app_settings(db)
    type_nom = "—"
    if carte.abonnement and carte.abonnement.type_abonnement:
        type_nom = carte.abonnement.type_abonnement.nom

    return {
        "numero_membre": client.numero_membre,
        "nom_complet": f"{client.prenom} {client.nom}",
        "type_abonnement": type_nom,
        "date_expiration": carte.date_expiration.strftime("%d/%m/%Y"),
        "qr_code_uuid": str(carte.qr_code_uuid),
        "logo_url": settings.logo_url,
        "nom_salle": settings.nom_salle,
        "statut": carte.statut,
    }
