"""Service métier du module Clients."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.client import Client
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
    """Supprime définitivement un client (hard delete)."""
    db.delete(client)
    db.commit()
