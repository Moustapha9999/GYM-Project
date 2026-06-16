"""
Centre de messages — génère des messages prêts à envoyer selon la situation.

Pour chaque message, renvoie :
  - le texte brut (à copier)
  - un lien wa.me (ouvre WhatsApp pré-rempli, 1 clic)

Fonctionne SANS micro-service : la réceptionniste envoie manuellement.
Quand le micro-service WhatsApp sera actif, les mêmes templates serviront
à l'envoi automatique (via notification_triggers).
"""
import urllib.parse
import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models.abonnement import Abonnement
from app.models.carte_membre import CarteMembre
from app.models.client import Client
from app.models.parametre_systeme import ParametreSysteme


class MessageError(Exception):
    pass


NOM_SALLE = "TOTAL FITNESS"


def _param(db: Session, cle: str, defaut: str = "") -> str:
    p = db.query(ParametreSysteme).filter(ParametreSysteme.cle == cle).first()
    return p.valeur if p and p.valeur is not None else defaut


def _normaliser_numero(numero: str) -> str:
    """Garde uniquement les chiffres (format wa.me)."""
    return "".join(c for c in (numero or "") if c.isdigit())


def _lien_whatsapp(numero: str, texte: str) -> str | None:
    num = _normaliser_numero(numero)
    if not num:
        return None
    texte_encode = urllib.parse.quote(texte)
    return f"https://wa.me/{num}?text={texte_encode}"


def _signature(db: Session) -> str:
    """Signature ajoutée en bas de chaque message (nom + numéro de la salle)."""
    nom = _param(db, "nom_salle", NOM_SALLE)
    numero = _param(db, "numero_salle", "")
    if numero:
        return f"\n\n— {nom} · 📞 {numero}"
    return f"\n\n— {nom}"


def _abonnement_actuel(db: Session, client_id: uuid.UUID) -> Abonnement | None:
    return (
        db.query(Abonnement)
        .filter(Abonnement.client_id == client_id)
        .order_by(Abonnement.date_fin.desc())
        .first()
    )


# ── Templates de messages ───────────────────────────────────
def _texte_bienvenue(client: Client) -> str:
    return (
        f"Bonjour {client.prenom} 👋\n"
        f"Bienvenue chez {NOM_SALLE} ! 🏋️\n"
        f"Votre numéro de membre est {client.numero_membre}.\n"
        f"Discipline · Force · Résultats. À très vite en salle !"
    )


def _texte_carte_prete(client: Client, carte: CarteMembre | None, nom_salle: str = NOM_SALLE) -> str:
    base = (
        f"Bonjour {client.prenom},\n"
        f"Votre carte de membre {nom_salle} est prête ✅\n"
        f"N° membre : {client.numero_membre}\n"
        f"Présentez votre QR code à l'entrée pour pointer vos séances."
    )
    return base


def _texte_renouvellement(client: Client, abo: Abonnement | None) -> str:
    if abo:
        fin = abo.date_fin.strftime("%d/%m/%Y")
        return (
            f"Bonjour {client.prenom},\n"
            f"Merci d'avoir renouvelé votre abonnement {NOM_SALLE} ! ✅\n"
            f"Montant : {abo.montant} MRU\n"
            f"Valable jusqu'au {fin}. Bon entraînement 💪"
        )
    return (
        f"Bonjour {client.prenom}, merci d'avoir renouvelé votre abonnement "
        f"{NOM_SALLE} ! Bon entraînement 💪"
    )


def _texte_alerte_fin(client: Client, abo: Abonnement | None) -> str:
    if abo:
        fin = abo.date_fin.strftime("%d/%m/%Y")
        jours = (abo.date_fin - date.today()).days
        if jours > 0:
            echeance = f"expire dans {jours} jour(s) (le {fin})"
        elif jours == 0:
            echeance = "expire aujourd'hui"
        else:
            echeance = f"a expiré le {fin}"
        return (
            f"Bonjour {client.prenom},\n"
            f"Votre abonnement {NOM_SALLE} {echeance}.\n"
            f"Pensez à le renouveler pour continuer à vous entraîner sans interruption ! 🔔"
        )
    return (
        f"Bonjour {client.prenom}, pensez à renouveler votre abonnement {NOM_SALLE} ! 🔔"
    )


def _texte_recu_paiement(client: Client, abo: Abonnement | None) -> str:
    montant = abo.montant if abo else "—"
    return (
        f"Bonjour {client.prenom},\n"
        f"Nous confirmons votre paiement chez {NOM_SALLE}.\n"
        f"Montant : {montant} MRU\n"
        f"Merci de votre confiance ! 🧾"
    )


# Catalogue des types disponibles
TYPES_MESSAGES = {
    "bienvenue": ("Message de bienvenue", _texte_bienvenue),
    "carte_prete": ("Carte de membre prête", _texte_carte_prete),
    "renouvellement": ("Confirmation de renouvellement", _texte_renouvellement),
    "alerte_fin": ("Alerte fin d'abonnement", _texte_alerte_fin),
    "recu_paiement": ("Reçu de paiement", _texte_recu_paiement),
}


def types_disponibles() -> list[dict]:
    return [{"code": code, "libelle": lib} for code, (lib, _) in TYPES_MESSAGES.items()]


def generer(db: Session, client_id: uuid.UUID, type_message: str) -> dict:
    """Génère un message pour un client selon le type demandé."""
    if type_message not in TYPES_MESSAGES:
        raise MessageError(f"Type de message inconnu : {type_message}")

    client = db.query(Client).filter(Client.id == client_id).first()
    if client is None:
        raise MessageError("Client introuvable.")

    libelle, fonction = TYPES_MESSAGES[type_message]

    # Construire le texte selon ce dont le template a besoin
    if type_message == "bienvenue":
        texte = fonction(client)
    elif type_message == "carte_prete":
        carte = (
            db.query(CarteMembre)
            .filter(CarteMembre.client_id == client_id, CarteMembre.statut == "Actif")
            .order_by(CarteMembre.date_generation.desc())
            .first()
        )
        nom_salle = _param(db, "nom_salle", NOM_SALLE)
        texte = _texte_carte_prete(client, carte, nom_salle)
    else:
        abo = _abonnement_actuel(db, client_id)
        texte = fonction(client, abo)

    # Ajouter la signature de la salle (nom + numéro)
    texte = texte + _signature(db)

    numero = client.whatsapp or client.telephone
    return {
        "type_message": type_message,
        "libelle": libelle,
        "client_id": client.id,
        "client_nom": f"{client.prenom} {client.nom}",
        "numero_telephone": numero,
        "texte": texte,
        "lien_whatsapp": _lien_whatsapp(numero, texte),
    }


def generer_tous(db: Session, client_id: uuid.UUID) -> list[dict]:
    """Génère tous les messages pertinents pour un client (centre de messages)."""
    resultats = []
    for code in TYPES_MESSAGES:
        try:
            resultats.append(generer(db, client_id, code))
        except MessageError:
            continue
    return resultats
