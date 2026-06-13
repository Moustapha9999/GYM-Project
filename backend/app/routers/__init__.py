"""Agrégation de tous les routers de l'API."""
from fastapi import APIRouter

from app.routers import auth, clients, abonnements, seances_journalieres, presences, paiements, dashboard

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(abonnements.router)
api_router.include_router(seances_journalieres.router)
api_router.include_router(presences.router)
api_router.include_router(paiements.router)
api_router.include_router(dashboard.router)

# Les autres routers seront ajoutés ici au fur et à mesure :
# api_router.include_router(clients.router)
# api_router.include_router(abonnements.router)
# etc.
