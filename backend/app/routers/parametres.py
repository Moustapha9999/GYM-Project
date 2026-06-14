"""Router Paramètres système + Journal d'audit + Clôture de caisse."""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.audit import AuditRead
from app.schemas.caisse import ClotureRequest, EtatCaisse, JournalCaisseRead
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.parametre import ParametreRead, ParametreUpdate
from app.services import audit_service, caisse_service, parametre_service
from app.services.caisse_service import CaisseError
from app.utils.pagination import paginate

router = APIRouter(tags=["Administration"])


# ── Paramètres système ──────────────────────────────────────
@router.get("/parametres", response_model=ApiResponse[list[ParametreRead]])
def lister_parametres(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("parametres.lecture")),
):
    params = parametre_service.lister(db)
    return ApiResponse(success=True, data=[ParametreRead.model_validate(p) for p in params])


@router.put("/parametres/{cle}", response_model=ApiResponse[ParametreRead])
def modifier_parametre(
    cle: str,
    payload: ParametreUpdate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("parametres.modification")),
):
    param = parametre_service.obtenir(db, cle)
    if param is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paramètre introuvable.")
    param = parametre_service.modifier(db, param, payload.valeur)
    return ApiResponse(success=True, data=ParametreRead.model_validate(param), message="Paramètre modifié.")


# ── Journal d'audit ─────────────────────────────────────────
@router.get("/journal-audit", response_model=PaginatedResponse[AuditRead])
def lister_audit(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("audit.lecture")),
    utilisateur_id: uuid.UUID | None = Query(None),
    module: str | None = Query(None),
    action: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = audit_service.lister(db, utilisateur_id=utilisateur_id, module=module, action=action)
    items, meta = paginate(query, page, per_page)
    return PaginatedResponse(success=True, data=[AuditRead.model_validate(a) for a in items], meta=meta)


# ── Clôture de caisse ───────────────────────────────────────
@router.get("/caisse/etat", response_model=ApiResponse[EtatCaisse])
def etat_caisse(
    jour: date | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("finances.lecture")),
):
    data = caisse_service.etat_du_jour(db, jour or date.today())
    return ApiResponse(success=True, data=data)


@router.post("/caisse/cloturer", response_model=ApiResponse[JournalCaisseRead])
def cloturer_caisse(
    payload: ClotureRequest,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("finances.validation")),
):
    try:
        journal = caisse_service.cloturer(db, payload.jour or date.today(), current_user.id)
    except CaisseError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ApiResponse(success=True, data=JournalCaisseRead.model_validate(journal), message="Caisse clôturée.")


@router.get("/caisse/historique", response_model=PaginatedResponse[JournalCaisseRead])
def historique_caisse(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("finances.lecture")),
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=100),
):
    query = caisse_service.lister(db)
    items, meta = paginate(query, page, per_page)
    return PaginatedResponse(success=True, data=[JournalCaisseRead.model_validate(j) for j in items], meta=meta)
