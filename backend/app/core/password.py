"""Validation de la robustesse des mots de passe."""
import re


def validate_password_strength(password: str) -> str:
    """Lève ValueError si le mot de passe ne respecte pas la politique."""
    if len(password) < 8:
        raise ValueError("Le mot de passe doit contenir au moins 8 caractères.")
    if len(password) > 128:
        raise ValueError("Le mot de passe ne doit pas dépasser 128 caractères.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Le mot de passe doit contenir au moins une majuscule.")
    if not re.search(r"[a-z]", password):
        raise ValueError("Le mot de passe doit contenir au moins une minuscule.")
    if not re.search(r"\d", password):
        raise ValueError("Le mot de passe doit contenir au moins un chiffre.")
    return password
