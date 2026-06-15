"""Agrégation de tous les routers de l'API."""
from fastapi import APIRouter

from app.routers import (
    auth, clients, abonnements, seances_journalieres, presences,
    paiements, dashboard, finances, rh, coach, notifications, rapports,
    utilisateurs, cartes_membres, parametres,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(abonnements.router)
api_router.include_router(abonnements.types_router)
api_router.include_router(cartes_membres.router)
api_router.include_router(seances_journalieres.router)
api_router.include_router(presences.router)
api_router.include_router(paiements.router)
api_router.include_router(dashboard.router)
api_router.include_router(finances.router)
api_router.include_router(rh.router)
api_router.include_router(coach.router)
api_router.include_router(notifications.router)
api_router.include_router(rapports.router)
api_router.include_router(utilisateurs.router)
api_router.include_router(parametres.router)
