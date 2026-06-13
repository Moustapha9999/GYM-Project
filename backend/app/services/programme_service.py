"""Service métier des Programmes sportifs."""
import uuid

from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.employe import Employe
from app.models.programme_sportif import ProgrammeSportif


class ProgrammeError(Exception):
    pass


def lister(db: Session, client_id: uuid.UUID | None = None, coach_id: uuid.UUID | None = None,
           actif: bool | None = None):
    query = db.query(ProgrammeSportif)
    if client_id:
        query = query.filter(ProgrammeSportif.client_id == client_id)
    if coach_id:
        query = query.filter(ProgrammeSportif.coach_id == coach_id)
    if actif is not None:
        query = query.filter(ProgrammeSportif.actif == actif)
    return query.order_by(ProgrammeSportif.created_at.desc())


def obtenir(db: Session, programme_id: uuid.UUID) -> ProgrammeSportif | None:
    return db.query(ProgrammeSportif).filter(ProgrammeSportif.id == programme_id).first()


def creer(db: Session, data) -> ProgrammeSportif:
    if db.query(Client).filter(Client.id == data.client_id).first() is None:
        raise ProgrammeError("Client introuvable.")
    if db.query(Employe).filter(Employe.id == data.coach_id).first() is None:
        raise ProgrammeError("Coach introuvable.")
    programme = ProgrammeSportif(**data.model_dump())
    db.add(programme)
    db.commit()
    db.refresh(programme)
    return programme


def modifier(db: Session, programme: ProgrammeSportif, data) -> ProgrammeSportif:
    for champ, valeur in data.model_dump(exclude_unset=True).items():
        setattr(programme, champ, valeur)
    db.commit()
    db.refresh(programme)
    return programme


def supprimer(db: Session, programme: ProgrammeSportif) -> None:
    db.delete(programme)
    db.commit()
