"""Router du module Coach (Programmes sportifs + Planning)."""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.client import Client
from app.models.employe import Employe
from app.models.utilisateur import Utilisateur
from app.schemas.coach import (
    CoachLight,
    PlanningCreate,
    PlanningRead,
    PlanningUpdate,
    ProgrammeCreate,
    ProgrammeRead,
    ProgrammeUpdate,
)
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services import employe_service, planning_service, programme_service
from app.services.planning_service import PlanningError
from app.services.programme_service import ProgrammeError
from app.utils.pagination import paginate

router = APIRouter(prefix="/coach", tags=["Coach"])


def _charger_noms(db: Session, items: list) -> tuple[dict, dict]:
    """Construit les maps {coach_id: Employe} et {client_id: Client} pour une liste."""
    coach_ids = {i.coach_id for i in items if getattr(i, "coach_id", None)}
    client_ids = {i.client_id for i in items if getattr(i, "client_id", None)}
    coachs = (
        {e.id: e for e in db.query(Employe).filter(Employe.id.in_(coach_ids)).all()}
        if coach_ids else {}
    )
    clients = (
        {c.id: c for c in db.query(Client).filter(Client.id.in_(client_ids)).all()}
        if client_ids else {}
    )
    return coachs, clients


def _enrichir(read, item, coachs: dict, clients: dict):
    coach = coachs.get(item.coach_id)
    if coach is not None:
        read.coach_nom = coach.nom
        read.coach_prenom = coach.prenom
    client = clients.get(getattr(item, "client_id", None))
    if client is not None:
        read.client_nom = client.nom
        read.client_prenom = client.prenom
    return read


# ── Coachs (sélecteur) ──────────────────────────────────────
@router.get("/coachs", response_model=ApiResponse[list[CoachLight]])
def lister_coachs(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("planning.lecture")),
):
    coachs = employe_service.lister(db, fonction="Coach").all()
    return ApiResponse(success=True, data=[CoachLight.model_validate(c) for c in coachs])


# ── Programmes sportifs ─────────────────────────────────────
@router.get("/programmes-sportifs", response_model=PaginatedResponse[ProgrammeRead])
def lister_programmes(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("programmes_sportifs.lecture")),
    client_id: uuid.UUID | None = Query(None),
    coach_id: uuid.UUID | None = Query(None),
    actif: bool | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = programme_service.lister(db, client_id=client_id, coach_id=coach_id, actif=actif)
    items, meta = paginate(query, page, per_page)
    coachs, clients = _charger_noms(db, items)
    data = [_enrichir(ProgrammeRead.model_validate(p), p, coachs, clients) for p in items]
    return PaginatedResponse(success=True, data=data, meta=meta)


@router.post("/programmes-sportifs", response_model=ApiResponse[ProgrammeRead], status_code=status.HTTP_201_CREATED)
def creer_programme(
    payload: ProgrammeCreate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("programmes_sportifs.creation")),
):
    try:
        prog = programme_service.creer(db, payload)
    except ProgrammeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ApiResponse(success=True, data=ProgrammeRead.model_validate(prog), message="Programme créé.")


@router.put("/programmes-sportifs/{programme_id}", response_model=ApiResponse[ProgrammeRead])
def modifier_programme(
    programme_id: uuid.UUID,
    payload: ProgrammeUpdate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("programmes_sportifs.modification")),
):
    prog = programme_service.obtenir(db, programme_id)
    if prog is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programme introuvable.")
    prog = programme_service.modifier(db, prog, payload)
    return ApiResponse(success=True, data=ProgrammeRead.model_validate(prog), message="Programme modifié.")


@router.delete("/programmes-sportifs/{programme_id}", response_model=ApiResponse[None])
def supprimer_programme(
    programme_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("programmes_sportifs.suppression")),
):
    prog = programme_service.obtenir(db, programme_id)
    if prog is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Programme introuvable.")
    programme_service.supprimer(db, prog)
    return ApiResponse(success=True, data=None, message="Programme supprimé.")


# ── Planning ────────────────────────────────────────────────
@router.get("/planning", response_model=PaginatedResponse[PlanningRead])
def lister_planning(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("planning.lecture")),
    coach_id: uuid.UUID | None = Query(None),
    jour: date | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
):
    query = planning_service.lister(db, coach_id=coach_id, jour=jour)
    items, meta = paginate(query, page, per_page)
    coachs, clients = _charger_noms(db, items)
    data = [_enrichir(PlanningRead.model_validate(p), p, coachs, clients) for p in items]
    return PaginatedResponse(success=True, data=data, meta=meta)


@router.post("/planning", response_model=ApiResponse[PlanningRead], status_code=status.HTTP_201_CREATED)
def creer_planning(
    payload: PlanningCreate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("planning.creation")),
):
    try:
        plan = planning_service.creer(db, payload)
    except PlanningError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ApiResponse(success=True, data=PlanningRead.model_validate(plan), message="Séance planifiée.")


@router.put("/planning/{planning_id}", response_model=ApiResponse[PlanningRead])
def modifier_planning(
    planning_id: uuid.UUID,
    payload: PlanningUpdate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("planning.modification")),
):
    plan = planning_service.obtenir(db, planning_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planning introuvable.")
    plan = planning_service.modifier(db, plan, payload)
    return ApiResponse(success=True, data=PlanningRead.model_validate(plan), message="Planning modifié.")


@router.delete("/planning/{planning_id}", response_model=ApiResponse[None])
def supprimer_planning(
    planning_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("planning.suppression")),
):
    plan = planning_service.obtenir(db, planning_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planning introuvable.")
    planning_service.supprimer(db, plan)
    return ApiResponse(success=True, data=None, message="Planning supprimé.")
