"""Service métier du module Dépenses / Finances."""
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.depense import CategorieDepense, Depense
from app.models.paiement import Paiement


class DepenseError(Exception):
    pass


def _generer_reference() -> str:
    horodatage = datetime.now(timezone.utc).strftime("%Y%m")
    return f"DEP-{horodatage}-{uuid.uuid4().hex[:8]}"


def lister_categories(db: Session):
    return db.query(CategorieDepense).order_by(CategorieDepense.nom).all()


def lister(db: Session, date_debut: date | None = None, date_fin: date | None = None,
           categorie_id: uuid.UUID | None = None):
    query = db.query(Depense)
    if date_debut:
        query = query.filter(Depense.date_depense >= date_debut)
    if date_fin:
        query = query.filter(Depense.date_depense <= date_fin)
    if categorie_id:
        query = query.filter(Depense.categorie_id == categorie_id)
    return query.order_by(Depense.date_depense.desc(), Depense.created_at.desc())


def obtenir(db: Session, depense_id: uuid.UUID) -> Depense | None:
    return db.query(Depense).filter(Depense.id == depense_id).first()


def creer(db: Session, data, created_by: uuid.UUID) -> Depense:
    cat = db.query(CategorieDepense).filter(CategorieDepense.id == data.categorie_id).first()
    if cat is None:
        raise DepenseError("Catégorie de dépense introuvable.")
    payload = data.model_dump()
    if not payload.get("date_depense"):
        payload["date_depense"] = date.today()
    depense = Depense(reference=_generer_reference(), created_by=created_by, **payload)
    db.add(depense)
    db.commit()
    db.refresh(depense)
    return depense


def modifier(db: Session, depense: Depense, data) -> Depense:
    for champ, valeur in data.model_dump(exclude_unset=True).items():
        setattr(depense, champ, valeur)
    db.commit()
    db.refresh(depense)
    return depense


def supprimer(db: Session, depense: Depense) -> None:
    db.delete(depense)
    db.commit()


def bilan(db: Session, date_debut: date, date_fin: date) -> dict:
    debut_dt = datetime(date_debut.year, date_debut.month, date_debut.day, 0, 0, 0, tzinfo=timezone.utc)
    fin_dt = datetime(date_fin.year, date_fin.month, date_fin.day, 23, 59, 59, tzinfo=timezone.utc)

    total_revenus = Decimal(str(
        db.query(func.coalesce(func.sum(Paiement.montant), 0)).filter(
            Paiement.date_paiement >= debut_dt,
            Paiement.date_paiement <= fin_dt,
            Paiement.statut == "Validé",
        ).scalar()
    ))

    total_depenses = Decimal(str(
        db.query(func.coalesce(func.sum(Depense.montant), 0)).filter(
            Depense.date_depense >= date_debut,
            Depense.date_depense <= date_fin,
        ).scalar()
    ))

    par_cat = (
        db.query(CategorieDepense.nom, func.coalesce(func.sum(Depense.montant), 0))
        .join(Depense, Depense.categorie_id == CategorieDepense.id)
        .filter(Depense.date_depense >= date_debut, Depense.date_depense <= date_fin)
        .group_by(CategorieDepense.nom)
        .all()
    )
    depenses_par_categorie = [
        {"categorie": nom, "total": Decimal(str(tot))} for nom, tot in par_cat
    ]

    return {
        "date_debut": date_debut,
        "date_fin": date_fin,
        "total_revenus": total_revenus,
        "total_depenses": total_depenses,
        "benefice": total_revenus - total_depenses,
        "depenses_par_categorie": depenses_par_categorie,
    }
