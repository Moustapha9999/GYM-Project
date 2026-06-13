"""Router du module RH (Employés + Salaires)."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.rh import (
    EmployeCreate,
    EmployeRead,
    EmployeUpdate,
    FichePaieCreate,
    FichePaieRead,
    MasseSalariale,
)
from app.services import employe_service, fiche_paie_service
from app.services.fiche_paie_service import FichePaieError
from app.utils.pagination import paginate

router = APIRouter(prefix="/rh", tags=["RH / Salaires"])


# ── Employés ────────────────────────────────────────────────
@router.get("/employes", response_model=PaginatedResponse[EmployeRead])
def lister_employes(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("employes.lecture")),
    search: str | None = Query(None),
    statut: str | None = Query(None),
    fonction: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = employe_service.lister(db, search=search, statut=statut, fonction=fonction)
    items, meta = paginate(query, page, per_page)
    return PaginatedResponse(success=True, data=[EmployeRead.model_validate(e) for e in items], meta=meta)


@router.post("/employes", response_model=ApiResponse[EmployeRead], status_code=status.HTTP_201_CREATED)
def creer_employe(
    payload: EmployeCreate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("employes.creation")),
):
    employe = employe_service.creer(db, payload)
    return ApiResponse(success=True, data=EmployeRead.model_validate(employe), message="Employé créé.")


@router.get("/employes/{employe_id}", response_model=ApiResponse[EmployeRead])
def detail_employe(
    employe_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("employes.lecture")),
):
    employe = employe_service.obtenir(db, employe_id)
    if employe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employé introuvable.")
    return ApiResponse(success=True, data=EmployeRead.model_validate(employe))


@router.put("/employes/{employe_id}", response_model=ApiResponse[EmployeRead])
def modifier_employe(
    employe_id: uuid.UUID,
    payload: EmployeUpdate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("employes.modification")),
):
    employe = employe_service.obtenir(db, employe_id)
    if employe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employé introuvable.")
    employe = employe_service.modifier(db, employe, payload)
    return ApiResponse(success=True, data=EmployeRead.model_validate(employe), message="Employé modifié.")


@router.delete("/employes/{employe_id}", response_model=ApiResponse[None])
def supprimer_employe(
    employe_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("employes.suppression")),
):
    employe = employe_service.obtenir(db, employe_id)
    if employe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employé introuvable.")
    employe_service.supprimer(db, employe)
    return ApiResponse(success=True, data=None, message="Employé supprimé.")


# ── Fiches de paie ──────────────────────────────────────────
@router.get("/fiches-paie", response_model=PaginatedResponse[FichePaieRead])
def lister_fiches(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("salaires.lecture")),
    employe_id: uuid.UUID | None = Query(None),
    mois: int | None = Query(None),
    annee: int | None = Query(None),
    statut: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = fiche_paie_service.lister(db, employe_id=employe_id, mois=mois, annee=annee, statut=statut)
    items, meta = paginate(query, page, per_page)
    return PaginatedResponse(success=True, data=[FichePaieRead.model_validate(f) for f in items], meta=meta)


@router.post("/fiches-paie/generer", response_model=ApiResponse[FichePaieRead], status_code=status.HTTP_201_CREATED)
def generer_fiche(
    payload: FichePaieCreate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("salaires.creation")),
):
    try:
        fiche = fiche_paie_service.generer(db, payload)
    except FichePaieError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ApiResponse(success=True, data=FichePaieRead.model_validate(fiche),
                       message=f"Fiche générée — salaire net {fiche.salaire_final} MRU")


@router.patch("/fiches-paie/{fiche_id}/payer", response_model=ApiResponse[FichePaieRead])
def payer_fiche(
    fiche_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("salaires.validation")),
):
    fiche = fiche_paie_service.obtenir(db, fiche_id)
    if fiche is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fiche introuvable.")
    fiche = fiche_paie_service.marquer_payee(db, fiche)
    return ApiResponse(success=True, data=FichePaieRead.model_validate(fiche), message="Fiche marquée payée.")


@router.get("/masse-salariale", response_model=ApiResponse[MasseSalariale])
def masse_salariale(
    mois: int = Query(..., ge=1, le=12),
    annee: int = Query(...),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("salaires.lecture")),
):
    data = fiche_paie_service.masse_salariale(db, mois, annee)
    return ApiResponse(success=True, data=data)
