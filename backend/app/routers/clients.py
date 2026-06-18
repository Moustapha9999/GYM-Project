"""Router du module Clients — CRUD complet avec RBAC."""
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.client import (
    ClientCreate,
    ClientImportResult,
    ClientPhotoUpdate,
    ClientRead,
    ClientUpdate,
)
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services import audit_service, client_service, export_service, import_service
from app.utils.pagination import paginate
from app.utils.upload_validation import validate_excel_size

router = APIRouter(prefix="/clients", tags=["Clients"])


def _stream(contenu: bytes, media_type: str, filename: str) -> StreamingResponse:
    import io

    return StreamingResponse(
        io.BytesIO(contenu),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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


@router.get("/import-modele")
def telecharger_modele_import(
    _: Utilisateur = Depends(require_permission("clients.lecture")),
):
    """Télécharge le modèle Excel pour l'import en masse de clients."""
    xl = export_service.generer_modele_import_clients()
    return _stream(
        xl,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "modele_import_clients.xlsx",
    )


@router.post("/import-excel", response_model=ApiResponse[ClientImportResult])
async def importer_clients_excel(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("clients.creation")),
):
    """Importe des clients depuis un fichier Excel (.xlsx)."""
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format non supporté. Utilisez un fichier .xlsx.",
        )

    contenu = await file.read()
    if not contenu:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fichier vide.")

    try:
        validate_excel_size(contenu)
        resultat = import_service.importer_excel(db, contenu, created_by=current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="import_excel",
        module="clients",
        cible_table="clients",
        details={"crees": resultat["crees"], "echecs": resultat["echecs"]},
        request=request,
    )
    db.commit()

    message = f"{resultat['crees']} client(s) importé(s)."
    if resultat["echecs"]:
        message += f" {resultat['echecs']} ligne(s) en erreur."

    return ApiResponse(
        success=True,
        data=ClientImportResult(**resultat),
        message=message,
    )


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
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("clients.creation")),
):
    """Crée un nouveau client (numéro de membre auto-généré)."""
    client = client_service.creer(db, payload, created_by=current_user.id)
    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="creation",
        module="clients",
        cible_table="clients",
        cible_id=client.id,
        details={"numero_membre": client.numero_membre},
        request=request,
    )
    db.commit()
    return ApiResponse(
        success=True,
        data=ClientRead.model_validate(client),
        message=f"Client créé : {client.numero_membre}",
    )


@router.put("/{client_id}", response_model=ApiResponse[ClientRead])
def modifier_client(
    client_id: uuid.UUID,
    payload: ClientUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("clients.modification")),
):
    """Modifie un client existant."""
    client = client_service.obtenir(db, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable.")
    client = client_service.modifier(db, client, payload)
    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="modification",
        module="clients",
        cible_table="clients",
        cible_id=client.id,
        request=request,
    )
    db.commit()
    return ApiResponse(
        success=True,
        data=ClientRead.model_validate(client),
        message="Client modifié.",
    )


@router.put("/{client_id}/photo", response_model=ApiResponse[ClientRead])
def modifier_photo_client(
    client_id: uuid.UUID,
    payload: ClientPhotoUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("clients.modification")),
):
    """Met à jour la photo du client (base64 data URL)."""
    client = client_service.obtenir(db, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable.")
    try:
        client = client_service.modifier_photo(db, client, payload.photo_base64)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="modification_photo",
        module="clients",
        cible_table="clients",
        cible_id=client.id,
        request=request,
    )
    db.commit()
    return ApiResponse(
        success=True,
        data=ClientRead.model_validate(client),
        message="Photo mise à jour.",
    )


@router.delete("/{client_id}", response_model=ApiResponse[None])
def supprimer_client(
    client_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("clients.suppression")),
):
    """Supprime définitivement un client (hard delete)."""
    client = client_service.obtenir(db, client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client introuvable.")
    numero = client.numero_membre
    client_service.supprimer(db, client)
    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="suppression",
        module="clients",
        cible_table="clients",
        cible_id=client_id,
        details={"numero_membre": numero},
        request=request,
    )
    db.commit()
    return ApiResponse(success=True, data=None, message="Client supprimé.")
