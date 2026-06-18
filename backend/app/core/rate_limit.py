"""Rate limiting en mémoire pour les endpoints sensibles (login)."""
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

_WINDOW_SECONDS = 60
_MAX_ATTEMPTS = 5
_attempts: dict[str, list[float]] = defaultdict(list)


def _client_key(request: Request, email: str) -> str:
    ip = request.client.host if request.client else "unknown"
    return f"{ip}:{email.lower().strip()}"


def _prune(key: str, now: float) -> list[float]:
    window_start = now - _WINDOW_SECONDS
    recent = [t for t in _attempts[key] if t > window_start]
    _attempts[key] = recent
    return recent


def check_login_rate_limit(request: Request, email: str) -> None:
    """Bloque si trop de tentatives échouées récentes pour cette IP + email."""
    key = _client_key(request, email)
    if len(_prune(key, time.time())) >= _MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Trop de tentatives de connexion. Réessayez dans une minute.",
        )


def record_login_failure(request: Request, email: str) -> None:
    """Enregistre une tentative de connexion échouée."""
    key = _client_key(request, email)
    _attempts[key].append(time.time())


def clear_login_attempts(request: Request, email: str) -> None:
    """Réinitialise le compteur après une connexion réussie."""
    _attempts.pop(_client_key(request, email), None)
