"""Service métier des Employés."""
import uuid

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.employe import Employe


def lister(db: Session, search: str | None = None, statut: str | None = None, fonction: str | None = None):
    query = db.query(Employe)
    if search:
        terme = f"%{search}%"
        query = query.filter(or_(Employe.nom.ilike(terme), Employe.prenom.ilike(terme)))
    if statut:
        query = query.filter(Employe.statut == statut)
    if fonction:
        query = query.filter(Employe.fonction == fonction)
    return query.order_by(Employe.created_at.desc())


def obtenir(db: Session, employe_id: uuid.UUID) -> Employe | None:
    return db.query(Employe).filter(Employe.id == employe_id).first()


def creer(db: Session, data) -> Employe:
    employe = Employe(**data.model_dump())
    db.add(employe)
    db.commit()
    db.refresh(employe)
    return employe


def modifier(db: Session, employe: Employe, data) -> Employe:
    for champ, valeur in data.model_dump(exclude_unset=True).items():
        setattr(employe, champ, valeur)
    db.commit()
    db.refresh(employe)
    return employe


def supprimer(db: Session, employe: Employe) -> None:
    db.delete(employe)
    db.commit()
