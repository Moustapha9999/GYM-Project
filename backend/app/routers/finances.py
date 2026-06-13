"""Router du module Dépenses / Finances."""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.depense import (
    BilanFinancier,
    CategorieDepenseRead,
    DepenseCreate,
    DepenseRead,
    DepenseUpdate,
)
from app.services import depense_service
from app.services.depense_service import DepenseError
from app.utils.pagination import paginate

router = APIRouter(prefix="/finances", tags=["Finances / Dépenses"])


@router.get("/categories-depenses", response_model=ApiResponse[list[CategorieDepenseRead]])
def lister_categories(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("finances.lecture")),
):
    cats = depense_service.lister_categories(db)
    return ApiResponse(success=True, data=[CategorieDepenseRead.model_validate(c) for c in cats])


@router.get("/depenses", response_model=PaginatedResponse[DepenseRead])
def lister_depenses(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("finances.lecture")),
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    categorie_id: uuid.UUID | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = depense_service.lister(db, date_debut=date_debut, date_fin=date_fin, categorie_id=categorie_id)
    items, meta = paginate(query, page, per_page)
    return PaginatedResponse(success=True, data=[DepenseRead.model_validate(d) for d in items], meta=meta)


@router.post("/depenses", response_model=ApiResponse[DepenseRead], status_code=status.HTTP_201_CREATED)
def creer_depense(
    payload: DepenseCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("finances.creation")),
):
    try:
        depense = depense_service.creer(db, payload, created_by=current_user.id)
    except DepenseError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ApiResponse(success=True, data=DepenseRead.model_validate(depense),
                       message=f"Dépense enregistrée : {depense.reference}")


@router.put("/depenses/{depense_id}", response_model=ApiResponse[DepenseRead])
def modifier_depense(
    depense_id: uuid.UUID,
    payload: DepenseUpdate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("finances.modification")),
):
    depense = depense_service.obtenir(db, depense_id)
    if depense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dépense introuvable.")
    depense = depense_service.modifier(db, depense, payload)
    return ApiResponse(success=True, data=DepenseRead.model_validate(depense), message="Dépense modifiée.")


@router.delete("/depenses/{depense_id}", response_model=ApiResponse[None])
def supprimer_depense(
    depense_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("finances.suppression")),
):
    depense = depense_service.obtenir(db, depense_id)
    if depense is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dépense introuvable.")
    depense_service.supprimer(db, depense)
    return ApiResponse(success=True, data=None, message="Dépense supprimée.")


@router.get("/bilan", response_model=ApiResponse[BilanFinancier])
def bilan_financier(
    date_debut: date = Query(...),
    date_fin: date = Query(...),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("finances.lecture")),
):
    data = depense_service.bilan(db, date_debut, date_fin)
    return ApiResponse(success=True, data=data)
