"""Router du module Clients — CRUD complet avec RBAC."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.client import ClientCreate, ClientRead, ClientUpdate
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services import client_service
from app.utils.pagination import paginate

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("", response_model=PaginatedResponse[ClientRead])
def lister_clients(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("clients.lecture")),
    search: str | None = Query(None, description="Recherche nom/prénom/numéro/téléphone"),
    sexe: str | None = Query(None),
    actif: bool | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Liste paginée des clients avec filtres."""
    query = client_service.lister(db, search=search, sexe=sexe, actif=actif)
    items, meta = paginate(query, page, per_page)
    return PaginatedResponse(
        success=True,
        data=[ClientRead.model_validate(c) for c in items],
        meta=meta,
        message=None,
    )


@router.get("/recherche", response_model=ApiResponse[ClientRead])
def rechercher_client(
    q: str = Query(..., description="Numéro de membre ou nom"),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("clients.lecture")),
):
    """Recherche rapide d'un client (pour pointage, renouvellement...)."""
    client = client_service.rechercher(db, q)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable.")
    return ApiResponse(success=True, data=ClientRead.model_validate(client))


@router.get("/{client_id}", response_model=ApiResponse[ClientRead])
def obtenir_client(
    client_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("clients.lecture")),
):
    """Détail d'un client."""
    client = client_service.obtenir(db, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable.")
    return ApiResponse(success=True, data=ClientRead.model_validate(client))


@router.post("", response_model=ApiResponse[ClientRead], status_code=status.HTTP_201_CREATED)
def creer_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("clients.creation")),
):
    """Crée un nouveau client (numéro de membre auto-généré)."""
    client = client_service.creer(db, payload, created_by=current_user.id)
    return ApiResponse(
        success=True,
        data=ClientRead.model_validate(client),
        message=f"Client créé : {client.numero_membre}",
    )


@router.put("/{client_id}", response_model=ApiResponse[ClientRead])
def modifier_client(
    client_id: uuid.UUID,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("clients.modification")),
):
    """Modifie un client existant."""
    client = client_service.obtenir(db, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable.")
    client = client_service.modifier(db, client, payload)
    return ApiResponse(
        success=True,
        data=ClientRead.model_validate(client),
        message="Client modifié.",
    )


@router.delete("/{client_id}", response_model=ApiResponse[None])
def supprimer_client(
    client_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("clients.suppression")),
):
    """Supprime définitivement un client (hard delete)."""
    client = client_service.obtenir(db, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable.")
    client_service.supprimer(db, client)
    return ApiResponse(success=True, data=None, message="Client supprimé.")
