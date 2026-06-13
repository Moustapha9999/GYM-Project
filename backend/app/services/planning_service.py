"""Service métier du Planning coach."""
import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models.employe import Employe
from app.models.planning_coach import PlanningCoach


class PlanningError(Exception):
    pass


def lister(db: Session, coach_id: uuid.UUID | None = None, jour: date | None = None):
    query = db.query(PlanningCoach)
    if coach_id:
        query = query.filter(PlanningCoach.coach_id == coach_id)
    if jour:
        query = query.filter(PlanningCoach.date_seance == jour)
    return query.order_by(PlanningCoach.date_seance.desc(), PlanningCoach.heure_debut)


def obtenir(db: Session, planning_id: uuid.UUID) -> PlanningCoach | None:
    return db.query(PlanningCoach).filter(PlanningCoach.id == planning_id).first()


def creer(db: Session, data) -> PlanningCoach:
    if db.query(Employe).filter(Employe.id == data.coach_id).first() is None:
        raise PlanningError("Coach introuvable.")
    planning = PlanningCoach(**data.model_dump())
    db.add(planning)
    db.commit()
    db.refresh(planning)
    return planning


def modifier(db: Session, planning: PlanningCoach, data) -> PlanningCoach:
    for champ, valeur in data.model_dump(exclude_unset=True).items():
        setattr(planning, champ, valeur)
    db.commit()
    db.refresh(planning)
    return planning


def supprimer(db: Session, planning: PlanningCoach) -> None:
    db.delete(planning)
    db.commit()
