"""Service métier du module Séances journalières."""
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.paiement import Paiement
from app.models.parametre_systeme import ParametreSysteme
from app.models.seance_journaliere import SeanceJournaliere


class SeanceError(Exception):
    """Erreur métier lors de la gestion d'une séance journalière."""


def _get_tarif_seance(db: Session) -> Decimal:
    p = (
        db.query(ParametreSysteme)
        .filter(ParametreSysteme.cle == "tarif_seance_journaliere")
        .first()
    )
    if p and p.valeur:
        try:
            return Decimal(p.valeur)
        except Exception:
            pass
    return Decimal("50")


def _generer_reference_paiement() -> str:
    horodatage = datetime.now(timezone.utc).strftime("%Y%m")
    suffixe = uuid.uuid4().hex[:8]
    return f"PAY-{horodatage}-{suffixe}"


def enregistrer(
    db: Session,
    moyen_paiement_id: uuid.UUID,
    encaisse_par: uuid.UUID,
    client_id: uuid.UUID | None = None,
    nom_client_occasionnel: str | None = None,
) -> dict:
    """
    Enregistre une séance journalière + son paiement (transaction).
    """
    # Vérifier le client s'il est fourni
    if client_id:
        client = db.query(Client).filter(Client.id == client_id).first()
        if client is None:
            raise SeanceError("Client introuvable.")

    tarif = _get_tarif_seance(db)

    try:
        seance = SeanceJournaliere(
            client_id=client_id,
            nom_client_occasionnel=nom_client_occasionnel,
            date_seance=date.today(),
            montant=tarif,
            encaisse_par=encaisse_par,
        )
        db.add(seance)
        db.flush()

        reference = _generer_reference_paiement()
        paiement = Paiement(
            reference=reference,
            client_id=client_id,
            seance_journaliere_id=seance.id,
            type_paiement="Séance journalière",
            montant=tarif,
            moyen_paiement_id=moyen_paiement_id,
            statut="Validé",
            encaisse_par=encaisse_par,
        )
        db.add(paiement)

        db.commit()
        db.refresh(seance)

        return {
            "seance": seance,
            "paiement_reference": reference,
            "montant_paye": tarif,
        }
    except Exception:
        db.rollback()
        raise


def lister(db: Session, jour: date | None = None):
    query = db.query(SeanceJournaliere)
    if jour:
        query = query.filter(SeanceJournaliere.date_seance == jour)
    return query.order_by(SeanceJournaliere.created_at.desc())


def obtenir(db: Session, seance_id: uuid.UUID) -> SeanceJournaliere | None:
    return db.query(SeanceJournaliere).filter(SeanceJournaliere.id == seance_id).first()
