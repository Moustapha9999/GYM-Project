"""Service métier du module Clients."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.abonnement import Abonnement
from app.models.carte_membre import CarteMembre
from app.models.client import Client
from app.models.notification import Notification
from app.models.paiement import Paiement
from app.models.planning_coach import PlanningCoach
from app.models.seance_journaliere import SeanceJournaliere
from app.schemas.client import ClientCreate, ClientUpdate


def generer_numero_membre(db: Session) -> str:
    """
    Génère un numéro de membre unique au format TF-ANNEE-XXXX.
    Ex : TF-2026-0001
    """
    annee = datetime.now(timezone.utc).year
    prefixe = f"TF-{annee}-"

    # Compter les clients déjà créés cette année (selon leur numéro)
    dernier = (
        db.query(Client)
        .filter(Client.numero_membre.like(f"{prefixe}%"))
        .order_by(Client.numero_membre.desc())
        .first()
    )

    if dernier:
        dernier_seq = int(dernier.numero_membre.split("-")[-1])
        nouveau_seq = dernier_seq + 1
    else:
        nouveau_seq = 1

    return f"{prefixe}{nouveau_seq:04d}"


def lister(
    db: Session,
    search: str | None = None,
    sexe: str | None = None,
    actif: bool | None = None,
):
    """Retourne une requête filtrée (non paginée) des clients."""
    query = db.query(Client)

    if search:
        terme = f"%{search}%"
        query = query.filter(
            or_(
                Client.nom.ilike(terme),
                Client.prenom.ilike(terme),
                Client.numero_membre.ilike(terme),
                Client.telephone.ilike(terme),
            )
        )
    if sexe:
        query = query.filter(Client.sexe == sexe)
    if actif is not None:
        query = query.filter(Client.actif == actif)

    return query.order_by(Client.created_at.desc())


def obtenir(db: Session, client_id: uuid.UUID) -> Client | None:
    return db.query(Client).filter(Client.id == client_id).first()


def rechercher(db: Session, q: str) -> Client | None:
    """Recherche un client par numéro de membre, ou nom/prénom exact."""
    return (
        db.query(Client)
        .filter(
            or_(
                Client.numero_membre == q,
                func.concat(Client.prenom, " ", Client.nom).ilike(f"%{q}%"),
            )
        )
        .first()
    )


def creer(db: Session, data: ClientCreate, created_by: uuid.UUID) -> Client:
    """Crée un nouveau client avec numéro de membre auto-généré."""
    client = Client(
        numero_membre=generer_numero_membre(db),
        created_by=created_by,
        **data.model_dump(),
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


def modifier(db: Session, client: Client, data: ClientUpdate) -> Client:
    """Met à jour un client (seuls les champs fournis)."""
    updates = data.model_dump(exclude_unset=True)
    for champ, valeur in updates.items():
        setattr(client, champ, valeur)
    db.commit()
    db.refresh(client)
    return client


def modifier_photo(db: Session, client: Client, photo_base64: str) -> Client:
    """Met à jour la photo du client (stockée en data URL base64)."""
    photo = photo_base64.strip()
    if photo and not photo.startswith("data:"):
        photo = f"data:image/jpeg;base64,{photo}"
    client.photo_url = photo or None
    db.commit()
    db.refresh(client)
    return client


def supprimer(db: Session, client: Client) -> None:
    """
    Supprime définitivement un client et toutes ses données liées.
    Les tables sans CASCADE DB (paiements, séances, notifications…) sont
    nettoyées explicitement pour éviter les erreurs d'intégrité référentielle.
    """
    client_id = client.id

    abo_ids = [
        row[0]
        for row in db.query(Abonnement.id).filter(Abonnement.client_id == client_id).all()
    ]
    seance_ids = [
        row[0]
        for row in db.query(SeanceJournaliere.id)
        .filter(SeanceJournaliere.client_id == client_id)
        .all()
    ]

    paiement_filters = [Paiement.client_id == client_id]
    if abo_ids:
        paiement_filters.append(Paiement.abonnement_id.in_(abo_ids))
    if seance_ids:
        paiement_filters.append(Paiement.seance_journaliere_id.in_(seance_ids))

    db.query(Paiement).filter(or_(*paiement_filters)).delete(synchronize_session=False)

    db.query(CarteMembre).filter(CarteMembre.client_id == client_id).delete(
        synchronize_session=False
    )
    db.query(Notification).filter(Notification.client_id == client_id).delete(
        synchronize_session=False
    )
    db.query(PlanningCoach).filter(PlanningCoach.client_id == client_id).delete(
        synchronize_session=False
    )
    db.query(SeanceJournaliere).filter(SeanceJournaliere.client_id == client_id).delete(
        synchronize_session=False
    )

    # Chaînage entre abonnements (renouvele_de) avant suppression
    db.query(Abonnement).filter(Abonnement.client_id == client_id).update(
        {"renouvele_de": None},
        synchronize_session=False,
    )
    db.query(Abonnement).filter(Abonnement.client_id == client_id).delete(
        synchronize_session=False
    )

    db.delete(client)
    db.commit()
