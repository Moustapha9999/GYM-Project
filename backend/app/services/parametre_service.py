"""Service métier des paramètres système."""
from sqlalchemy.orm import Session

from app.models.parametre_systeme import ParametreSysteme
from app.schemas.parametre import AppSettingsRead, AppSettingsUpdate

APP_KEYS = {
    "nom_salle": "TOTAL FITNESS",
    "numero_salle": "",
    "slogan": "Discipline · Force · Résultats",
    "logo_url": "",
    "theme_couleur": "#ea580c",
    "theme_mode": "light",
    "langue": "fr",
}


def _get(db: Session, cle: str, defaut: str = "") -> str:
    p = db.query(ParametreSysteme).filter(ParametreSysteme.cle == cle).first()
    if p and p.valeur is not None:
        return p.valeur
    return APP_KEYS.get(cle, defaut)


def _set(db: Session, cle: str, valeur: str | None, description: str | None = None) -> None:
    p = db.query(ParametreSysteme).filter(ParametreSysteme.cle == cle).first()
    if p:
        p.valeur = valeur
    else:
        db.add(ParametreSysteme(cle=cle, valeur=valeur, description=description))
    db.flush()


def lire_app_settings(db: Session) -> AppSettingsRead:
    logo = _get(db, "logo_url")
    return AppSettingsRead(
        nom_salle=_get(db, "nom_salle"),
        numero_salle=_get(db, "numero_salle"),
        slogan=_get(db, "slogan"),
        logo_url=logo if logo else None,
        theme_couleur=_get(db, "theme_couleur", "#ea580c"),
        theme_mode=_get(db, "theme_mode", "light"),
        langue=_get(db, "langue", "fr"),
    )


def mettre_a_jour_app_settings(db: Session, data: AppSettingsUpdate) -> AppSettingsRead:
    updates = data.model_dump(exclude_unset=True)
    descriptions = {
        "nom_salle": "Nom commercial de la salle",
        "numero_salle": "Numéro WhatsApp officiel de la salle (signature des messages)",
        "slogan": "Slogan affiché dans l'application",
        "logo_url": "Logo (data URL base64)",
        "theme_couleur": "Couleur principale du thème (hex)",
        "theme_mode": "Mode d'affichage : light ou dark",
        "langue": "Langue de l'interface : fr, en ou ar",
    }
    for cle, valeur in updates.items():
        if cle == "logo_url" and valeur is not None:
            logo = valeur.strip()
            if logo and not logo.startswith("data:") and not logo.startswith("http"):
                logo = f"data:image/png;base64,{logo}"
            valeur = logo or ""
        _set(db, cle, valeur, descriptions.get(cle))
    db.commit()
    return lire_app_settings(db)
