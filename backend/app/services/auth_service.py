"""Service d'authentification."""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.core.dependencies import get_user_permissions
from app.models.utilisateur import Utilisateur


def authenticate(db: Session, email: str, password: str) -> dict | None:
    """
    Vérifie les identifiants et retourne le token + infos utilisateur.
    Retourne None si l'authentification échoue.
    """
    user = db.query(Utilisateur).filter(Utilisateur.email == email).first()

    if user is None or not verify_password(password, user.password_hash):
        return None

    if not user.actif:
        return None

    # Mettre à jour la dernière connexion
    user.derniere_connexion = datetime.now(timezone.utc)
    db.commit()

    # Créer le token (sub = id utilisateur)
    token = create_access_token(data={"sub": str(user.id), "role": user.role.nom})

    return {
        "token": token,
        "type": "bearer",
        "utilisateur": {
            "id": user.id,
            "nom": user.nom,
            "prenom": user.prenom,
            "email": user.email,
            "role": {"nom": user.role.nom, "libelle": user.role.libelle},
            "permissions": get_user_permissions(user),
        },
    }
