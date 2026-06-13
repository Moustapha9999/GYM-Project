"""Agrégation de tous les routers de l'API."""
from fastapi import APIRouter

from app.routers import auth, clients, abonnements

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(abonnements.router)

# Les autres routers seront ajoutés ici au fur et à mesure :
# api_router.include_router(clients.router)
# api_router.include_router(abonnements.router)
# etc.
