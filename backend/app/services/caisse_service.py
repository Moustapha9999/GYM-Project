"""Service de clôture journalière de caisse."""
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.depense import Depense
from app.models.journal_caisse import JournalCaisse
from app.models.paiement import Paiement


class CaisseError(Exception):
    pass


def etat_du_jour(db: Session, jour: date) -> dict:
    """Calcule l'état de caisse d'un jour (sans clôturer)."""
    debut = datetime(jour.year, jour.month, jour.day, 0, 0, 0, tzinfo=timezone.utc)
    fin = datetime(jour.year, jour.month, jour.day, 23, 59, 59, tzinfo=timezone.utc)

    total_encaisse = Decimal(str(
        db.query(func.coalesce(func.sum(Paiement.montant), 0)).filter(
            Paiement.date_paiement >= debut,
            Paiement.date_paiement <= fin,
            Paiement.statut == "Validé",
        ).scalar()
    ))
    total_depenses = Decimal(str(
        db.query(func.coalesce(func.sum(Depense.montant), 0)).filter(
            Depense.date_depense == jour
        ).scalar()
    ))
    return {
        "jour": jour,
        "total_encaisse": total_encaisse,
        "total_depenses": total_depenses,
        "solde": total_encaisse - total_depenses,
    }


def cloturer(db: Session, jour: date, cloture_par: uuid.UUID) -> JournalCaisse:
    """Clôture la caisse d'un jour. Idempotent : si déjà clôturée, lève une erreur."""
    existante = db.query(JournalCaisse).filter(JournalCaisse.date_jour == jour).first()
    if existante and existante.statut == "Clôturée":
        raise CaisseError(f"La caisse du {jour} est déjà clôturée.")

    etat = etat_du_jour(db, jour)

    if existante:
        journal = existante
    else:
        journal = JournalCaisse(date_jour=jour)
        db.add(journal)

    journal.total_encaisse = etat["total_encaisse"]
    journal.total_depenses = etat["total_depenses"]
    journal.solde = etat["solde"]
    journal.statut = "Clôturée"
    journal.cloture_par = cloture_par
    journal.cloture_le = datetime.now(timezone.utc)

    db.commit()
    db.refresh(journal)
    return journal


def lister(db: Session):
    return db.query(JournalCaisse).order_by(JournalCaisse.date_jour.desc())
