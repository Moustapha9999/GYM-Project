"""Service métier des Fiches de paie."""
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.employe import Employe
from app.models.fiche_paie import FichePaie


class FichePaieError(Exception):
    pass


def lister(db: Session, employe_id: uuid.UUID | None = None, mois: int | None = None,
           annee: int | None = None, statut: str | None = None):
    query = db.query(FichePaie)
    if employe_id:
        query = query.filter(FichePaie.employe_id == employe_id)
    if mois:
        query = query.filter(FichePaie.mois == mois)
    if annee:
        query = query.filter(FichePaie.annee == annee)
    if statut:
        query = query.filter(FichePaie.statut_paiement == statut)
    return query.order_by(FichePaie.annee.desc(), FichePaie.mois.desc())


def obtenir(db: Session, fiche_id: uuid.UUID) -> FichePaie | None:
    return db.query(FichePaie).filter(FichePaie.id == fiche_id).first()


def generer(db: Session, data) -> FichePaie:
    employe = db.query(Employe).filter(Employe.id == data.employe_id).first()
    if employe is None:
        raise FichePaieError("Employé introuvable.")

    # Doublon ? (un employé ne peut avoir 2 fiches pour le même mois/année)
    existante = db.query(FichePaie).filter(
        FichePaie.employe_id == data.employe_id,
        FichePaie.mois == data.mois,
        FichePaie.annee == data.annee,
    ).first()
    if existante:
        raise FichePaieError(f"Une fiche existe déjà pour {data.mois}/{data.annee}.")

    if not (1 <= data.mois <= 12):
        raise FichePaieError("Le mois doit être entre 1 et 12.")

    # salaire_final est une colonne GÉNÉRÉE côté DB : ne pas l'inclure dans l'INSERT
    fiche = FichePaie(
        employe_id=data.employe_id,
        mois=data.mois,
        annee=data.annee,
        salaire_base=employe.salaire_base,
        primes=data.primes,
        bonus=data.bonus,
        retenues=data.retenues,
        statut_paiement="En attente",
    )
    db.add(fiche)
    db.commit()
    db.refresh(fiche)
    return fiche


def marquer_payee(db: Session, fiche: FichePaie) -> FichePaie:
    fiche.statut_paiement = "Payé"
    fiche.date_paiement = date.today()
    db.commit()
    db.refresh(fiche)
    return fiche


def masse_salariale(db: Session, mois: int, annee: int) -> dict:
    fiches = db.query(FichePaie).filter(FichePaie.mois == mois, FichePaie.annee == annee).all()
    total_brut = sum((f.salaire_base + f.primes + f.bonus for f in fiches), Decimal("0"))
    total_net = sum((f.salaire_final or Decimal("0") for f in fiches), Decimal("0"))
    return {
        "mois": mois,
        "annee": annee,
        "nombre_fiches": len(fiches),
        "total_brut": total_brut,
        "total_net": total_net,
    }
