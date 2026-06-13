"""Agrégation de tous les routers de l'API."""
from fastapi import APIRouter

from app.routers import auth, clients, abonnements, seances_journalieres

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(abonnements.router)
api_router.include_router(seances_journalieres.router)

# Les autres routers seront ajoutés ici au fur et à mesure :
# api_router.include_router(clients.router)
# api_router.include_router(abonnements.router)
# etc.
