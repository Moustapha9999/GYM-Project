"""Service des Paramètres système (configuration clé/valeur)."""
from sqlalchemy.orm import Session

from app.models.parametre_systeme import ParametreSysteme


def lister(db: Session):
    return db.query(ParametreSysteme).order_by(ParametreSysteme.cle).all()


def obtenir(db: Session, cle: str) -> ParametreSysteme | None:
    return db.query(ParametreSysteme).filter(ParametreSysteme.cle == cle).first()


def modifier(db: Session, parametre: ParametreSysteme, valeur: str) -> ParametreSysteme:
    parametre.valeur = valeur
    db.commit()
    db.refresh(parametre)
    return parametre
