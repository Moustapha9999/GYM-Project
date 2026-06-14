"""
Tâches planifiées (cron) :
- expirer_abonnements : passe les abonnements échus en 'Expiré'
- expirer_cartes : révoque les cartes échues
- rappels_expiration : notifie les abonnements expirant à J-7 / J-3 / J-0

Lancées par scripts/run_cron.py (via le scheduler de Render ou un cron système).
"""
from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.abonnement import Abonnement
from app.models.carte_membre import CarteMembre
from app.models.client import Client
from app.services import notification_service


def expirer_abonnements(db: Session) -> int:
    """Passe en 'Expiré' les abonnements actifs dont la date_fin est dépassée."""
    auj = date.today()
    abos = (
        db.query(Abonnement)
        .filter(Abonnement.statut == "Actif", Abonnement.date_fin < auj)
        .all()
    )
    for abo in abos:
        abo.statut = "Expiré"
    db.commit()
    return len(abos)


def expirer_cartes(db: Session) -> int:
    """Révoque les cartes actives dont la date_expiration est dépassée."""
    auj = date.today()
    cartes = (
        db.query(CarteMembre)
        .filter(CarteMembre.statut == "Actif", CarteMembre.date_expiration < auj)
        .all()
    )
    for carte in cartes:
        carte.statut = "Expiré"
    db.commit()
    return len(cartes)


def rappels_expiration(db: Session) -> dict:
    """
    Envoie des rappels aux clients dont l'abonnement expire à J-7, J-3 ou aujourd'hui.
    Retourne le nombre de rappels par échéance.
    """
    auj = date.today()
    cibles = {
        "j7": auj + timedelta(days=7),
        "j3": auj + timedelta(days=3),
        "j0": auj,
    }
    resultats = {}

    for cle, jour_cible in cibles.items():
        abos = (
            db.query(Abonnement, Client)
            .join(Client, Abonnement.client_id == Client.id)
            .filter(Abonnement.statut == "Actif", Abonnement.date_fin == jour_cible)
            .all()
        )
        envoyes = 0
        for abo, client in abos:
            numero = client.whatsapp or client.telephone
            if not numero:
                continue
            if cle == "j0":
                msg = (
                    f"Bonjour {client.prenom}, votre abonnement TOTAL FITNESS expire "
                    f"aujourd'hui. Pensez à le renouveler pour continuer à vous entraîner !"
                )
                type_notif = "expiration_jour"
            else:
                jours = 7 if cle == "j7" else 3
                msg = (
                    f"Bonjour {client.prenom}, votre abonnement TOTAL FITNESS expire dans "
                    f"{jours} jours ({abo.date_fin.strftime('%d/%m/%Y')}). Pensez à le renouveler !"
                )
                type_notif = f"expiration_j{jours}"

            notification_service.envoyer(
                db,
                destinataire_type="Client",
                numero_telephone=numero,
                type_notification=type_notif,
                message=msg,
                client_id=client.id,
            )
            envoyes += 1
        resultats[cle] = envoyes

    return resultats
