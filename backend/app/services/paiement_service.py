"""Service métier du module Paiements (journal + caisse du jour)."""
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.moyen_paiement import MoyenPaiement
from app.models.paiement import Paiement


class PaiementError(Exception):
    """Erreur métier lors de la création d'un paiement."""


def _generer_reference_paiement() -> str:
    horodatage = datetime.now(timezone.utc).strftime("%Y%m")
    suffixe = uuid.uuid4().hex[:8]
    return f"PAY-{horodatage}-{suffixe}"


def lister_detail(
    db: Session,
    date_debut: date | None = None,
    date_fin: date | None = None,
    moyen_paiement_id: uuid.UUID | None = None,
    type_paiement: str | None = None,
):
    """
    Journal des paiements enrichi (client + moyen de paiement lisibles).
    Retourne une liste de dicts (pas une Query car jointures multiples).
    """
    query = (
        db.query(Paiement, Client, MoyenPaiement)
        .outerjoin(Client, Paiement.client_id == Client.id)
        .join(MoyenPaiement, Paiement.moyen_paiement_id == MoyenPaiement.id)
    )

    if date_debut:
        query = query.filter(
            Paiement.date_paiement >= datetime(date_debut.year, date_debut.month, date_debut.day, tzinfo=timezone.utc)
        )
    if date_fin:
        fin = datetime(date_fin.year, date_fin.month, date_fin.day, 23, 59, 59, tzinfo=timezone.utc)
        query = query.filter(Paiement.date_paiement <= fin)
    if moyen_paiement_id:
        query = query.filter(Paiement.moyen_paiement_id == moyen_paiement_id)
    if type_paiement:
        query = query.filter(Paiement.type_paiement == type_paiement)

    query = query.order_by(Paiement.date_paiement.desc())

    resultats = []
    for paiement, client, moyen in query.all():
        nom_client = None
        if client:
            nom_client = f"{client.prenom} {client.nom}"
        resultats.append({
            "id": paiement.id,
            "reference": paiement.reference,
            "client_nom": nom_client,
            "type_paiement": paiement.type_paiement,
            "montant": paiement.montant,
            "moyen_paiement": moyen.libelle,
            "statut": paiement.statut,
            "date_paiement": paiement.date_paiement,
        })
    return resultats


def caisse_du_jour(db: Session, jour: date | None = None) -> dict:
    """Synthèse de la caisse pour un jour donné (défaut : aujourd'hui)."""
    if jour is None:
        jour = date.today()

    debut = datetime(jour.year, jour.month, jour.day, 0, 0, 0, tzinfo=timezone.utc)
    fin = datetime(jour.year, jour.month, jour.day, 23, 59, 59, tzinfo=timezone.utc)

    base = db.query(Paiement).filter(
        Paiement.date_paiement >= debut,
        Paiement.date_paiement <= fin,
        Paiement.statut == "Validé",
    )

    paiements = base.all()
    total = sum((p.montant for p in paiements), Decimal("0"))
    nombre = len(paiements)

    total_abos = sum(
        (p.montant for p in paiements if p.type_paiement == "Abonnement"), Decimal("0")
    )
    total_seances = sum(
        (p.montant for p in paiements if p.type_paiement == "Séance journalière"),
        Decimal("0"),
    )

    repartition_query = (
        db.query(
            MoyenPaiement.libelle,
            func.count(Paiement.id),
            func.coalesce(func.sum(Paiement.montant), 0),
        )
        .join(Paiement, Paiement.moyen_paiement_id == MoyenPaiement.id)
        .filter(
            Paiement.date_paiement >= debut,
            Paiement.date_paiement <= fin,
            Paiement.statut == "Validé",
        )
        .group_by(MoyenPaiement.libelle)
        .all()
    )

    repartition = [
        {"moyen_paiement": libelle, "nombre": nb, "total": Decimal(str(tot))}
        for libelle, nb, tot in repartition_query
    ]

    return {
        "jour": jour,
        "total_encaisse": total,
        "nombre_paiements": nombre,
        "repartition": repartition,
        "total_abonnements": total_abos,
        "total_seances": total_seances,
    }


def obtenir(db: Session, paiement_id: uuid.UUID) -> Paiement | None:
    return db.query(Paiement).filter(Paiement.id == paiement_id).first()


def creer(
    db: Session,
    type_paiement: str,
    moyen_paiement_id: uuid.UUID,
    encaisse_par: uuid.UUID,
    client_id: uuid.UUID | None = None,
    nom_client_occasionnel: str | None = None,
    montant: Decimal | None = None,
) -> dict:
    """
    Crée un paiement selon le type :
    - Abonnement / Séance journalière : délègue aux services métier
    - Service supplémentaire / Autre : encaissement direct
    """
    if type_paiement == "Abonnement":
        if not client_id:
            raise PaiementError("Un client est requis pour un abonnement.")
        from app.services.abonnement_service import AbonnementError, souscrire

        try:
            result = souscrire(
                db,
                client_id=client_id,
                moyen_paiement_id=moyen_paiement_id,
                encaisse_par=encaisse_par,
            )
        except AbonnementError as e:
            raise PaiementError(str(e)) from e
        return {
            "paiement_reference": result["paiement_reference"],
            "montant": result["montant_paye"],
            "type_paiement": "Abonnement",
        }

    if type_paiement == "Séance journalière":
        from app.services.seance_service import SeanceError, enregistrer

        try:
            result = enregistrer(
                db,
                moyen_paiement_id=moyen_paiement_id,
                encaisse_par=encaisse_par,
                client_id=client_id,
                nom_client_occasionnel=nom_client_occasionnel,
            )
        except SeanceError as e:
            raise PaiementError(str(e)) from e
        return {
            "paiement_reference": result["paiement_reference"],
            "montant": result["montant_paye"],
            "type_paiement": "Séance journalière",
        }

    if montant is None or montant <= 0:
        raise PaiementError("Montant invalide.")

    moyen = (
        db.query(MoyenPaiement)
        .filter(
            MoyenPaiement.id == moyen_paiement_id,
            MoyenPaiement.actif == True,  # noqa: E712
        )
        .first()
    )
    if moyen is None:
        raise PaiementError("Moyen de paiement invalide ou inactif.")

    if client_id:
        client = db.query(Client).filter(Client.id == client_id).first()
        if client is None:
            raise PaiementError("Client introuvable.")

    reference = _generer_reference_paiement()
    paiement = Paiement(
        reference=reference,
        client_id=client_id,
        type_paiement=type_paiement,
        montant=montant,
        moyen_paiement_id=moyen_paiement_id,
        statut="Validé",
        encaisse_par=encaisse_par,
    )
    db.add(paiement)
    db.commit()

    return {
        "paiement_reference": reference,
        "montant": montant,
        "type_paiement": type_paiement,
    }
