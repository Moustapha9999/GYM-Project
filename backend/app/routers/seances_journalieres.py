"""Router du module Séances journalières."""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.seance_journaliere import SeanceCreate, SeanceRead, SeanceResult
from app.services import seance_service
from app.services.seance_service import SeanceError
from app.utils.pagination import paginate

router = APIRouter(prefix="/seances-journalieres", tags=["Séances journalières"])


@router.get("", response_model=PaginatedResponse[SeanceRead])
def lister_seances(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("seances_journalieres.lecture")),
    jour: date | None = Query(None, description="Filtrer par jour (défaut : toutes)"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Liste paginée des séances journalières."""
    query = seance_service.lister(db, jour=jour)
    items, meta = paginate(query, page, per_page)
    return PaginatedResponse(
        success=True,
        data=[SeanceRead.model_validate(s) for s in items],
        meta=meta,
    )


@router.post("", response_model=ApiResponse[SeanceResult], status_code=status.HTTP_201_CREATED)
def enregistrer_seance(
    payload: SeanceCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("seances_journalieres.creation")),
):
    """Enregistre une séance journalière (50 MRU) + paiement."""
    try:
        result = seance_service.enregistrer(
            db,
            moyen_paiement_id=payload.moyen_paiement_id,
            encaisse_par=current_user.id,
            client_id=payload.client_id,
            nom_client_occasionnel=payload.nom_client_occasionnel,
        )
    except SeanceError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=result,
        message=f"Séance enregistrée — {result['montant_paye']} MRU",
    )
