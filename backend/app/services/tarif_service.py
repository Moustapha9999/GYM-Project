"""Service métier — tarifs séance et abonnements."""
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.parametre_systeme import ParametreSysteme
from app.models.type_abonnement import TypeAbonnement
from app.schemas.tarif import TarifsRead, TarifsUpdate


class TarifError(Exception):
    """Erreur métier lors de la gestion des tarifs."""


def _get_param(db: Session, cle: str, defaut: str) -> str:
    p = db.query(ParametreSysteme).filter(ParametreSysteme.cle == cle).first()
    if p and p.valeur:
        return p.valeur
    return defaut


def _set_param(db: Session, cle: str, valeur: str, description: str | None = None) -> None:
    p = db.query(ParametreSysteme).filter(ParametreSysteme.cle == cle).first()
    if p:
        p.valeur = valeur
    else:
        db.add(ParametreSysteme(cle=cle, valeur=valeur, description=description))
    db.flush()


def _obtenir_type_par_sexe(db: Session, sexe: str) -> TypeAbonnement:
    type_abo = (
        db.query(TypeAbonnement)
        .filter(TypeAbonnement.sexe == sexe, TypeAbonnement.actif.is_(True))
        .order_by(TypeAbonnement.created_at.asc())
        .first()
    )
    if type_abo is None:
        raise TarifError(f"Aucune formule d'abonnement active pour le sexe « {sexe} ».")
    return type_abo


def lire_tarifs(db: Session) -> TarifsRead:
    tarif_seance = Decimal(_get_param(db, "tarif_seance_journaliere", "50"))
    homme = _obtenir_type_par_sexe(db, "Homme")
    femme = _obtenir_type_par_sexe(db, "Femme")
    return TarifsRead(
        tarif_seance_journaliere=tarif_seance,
        abonnement_homme=homme,
        abonnement_femme=femme,
    )


def mettre_a_jour_tarifs(db: Session, payload: TarifsUpdate) -> TarifsRead:
    _set_param(
        db,
        "tarif_seance_journaliere",
        str(payload.tarif_seance_journaliere),
        "Tarif en MRU pour une séance journalière",
    )

    homme = _obtenir_type_par_sexe(db, "Homme")
    homme.montant = payload.abonnement_homme.montant
    homme.montant_inscription = payload.abonnement_homme.montant_inscription
    homme.description = (
        f"Abonnement mensuel homme (1er mois {payload.abonnement_homme.montant_inscription} MRU, "
        f"puis {payload.abonnement_homme.montant} MRU)"
    )

    femme = _obtenir_type_par_sexe(db, "Femme")
    femme.montant = payload.abonnement_femme.montant
    femme.montant_inscription = payload.abonnement_femme.montant_inscription
    femme.description = (
        f"Abonnement mensuel femme (1er mois {payload.abonnement_femme.montant_inscription} MRU, "
        f"puis {payload.abonnement_femme.montant} MRU)"
    )

    db.commit()
    return lire_tarifs(db)
