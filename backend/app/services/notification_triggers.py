"""
Déclencheurs de notifications automatiques.

Ces fonctions sont appelées par les services métier (abonnement, paiement, etc.)
pour envoyer des notifications WhatsApp/SMS lors d'événements clés.

IMPORTANT : un échec d'envoi ne doit JAMAIS faire échouer l'opération métier
principale (souscription, paiement...). Les erreurs sont donc capturées et
silencieuses côté métier — la trace reste en base via notification_service.
"""
import logging

from sqlalchemy.orm import Session

from app.services import notification_service

logger = logging.getLogger("notifications")


def _safe_envoyer(db: Session, **kwargs) -> None:
    """Envoie une notification sans jamais lever d'exception vers l'appelant."""
    try:
        notification_service.envoyer(db, **kwargs)
    except Exception as e:  # noqa: BLE001
        logger.warning(f"Échec notification ({kwargs.get('type_notification')}): {e}")


def notifier_bienvenue(db: Session, client) -> None:
    """Envoyé à la première inscription d'un client."""
    numero = client.whatsapp or client.telephone
    if not numero:
        return
    message = (
        f"Bonjour {client.prenom} et bienvenue chez TOTAL FITNESS ! 🏋️\n"
        f"Votre numéro de membre est {client.numero_membre}. "
        f"Discipline · Force · Résultats !"
    )
    _safe_envoyer(
        db,
        destinataire_type="Client",
        numero_telephone=numero,
        type_notification="bienvenue",
        message=message,
        client_id=client.id,
    )


def notifier_souscription(db: Session, client, abonnement, est_inscription: bool) -> None:
    """Envoyé après une souscription/renouvellement réussi."""
    numero = client.whatsapp or client.telephone
    if not numero:
        return
    action = "souscrit" if est_inscription else "renouvelé"
    message = (
        f"Bonjour {client.prenom}, vous avez {action} votre abonnement TOTAL FITNESS. ✅\n"
        f"Montant : {abonnement.montant} MRU\n"
        f"Valable jusqu'au {abonnement.date_fin.strftime('%d/%m/%Y')}. "
        f"Bon entraînement !"
    )
    _safe_envoyer(
        db,
        destinataire_type="Client",
        numero_telephone=numero,
        type_notification="renouvellement_reussi" if not est_inscription else "souscription_reussie",
        message=message,
        client_id=client.id,
    )


def notifier_paiement(db: Session, client, montant, type_paiement: str, reference: str) -> None:
    """Confirmation de paiement (reçu)."""
    if client is None:
        return
    numero = client.whatsapp or client.telephone
    if not numero:
        return
    message = (
        f"Bonjour {client.prenom}, nous confirmons votre paiement chez TOTAL FITNESS.\n"
        f"Type : {type_paiement}\n"
        f"Montant : {montant} MRU\n"
        f"Référence : {reference}\nMerci !"
    )
    _safe_envoyer(
        db,
        destinataire_type="Client",
        numero_telephone=numero,
        type_notification="confirmation_paiement",
        message=message,
        client_id=client.id,
    )


def notifier_salaire_paye(db: Session, employe, fiche) -> None:
    """Notifie un employé que son salaire a été payé."""
    if not employe.telephone:
        return
    message = (
        f"Bonjour {employe.prenom}, votre salaire de {fiche.mois}/{fiche.annee} "
        f"a été payé : {fiche.salaire_final} MRU. — TOTAL FITNESS"
    )
    _safe_envoyer(
        db,
        destinataire_type="Employé",
        numero_telephone=employe.telephone,
        type_notification="salaire_paye",
        message=message,
        employe_id=employe.id,
    )
