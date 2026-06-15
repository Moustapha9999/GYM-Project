"""Router des dashboards (3 vues par rôle)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.utilisateur import Utilisateur
from app.schemas.common import ApiResponse
from app.schemas.dashboard import DashboardAdmin, DashboardCoach, DashboardReception, AlertesDashboard
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/admin", response_model=ApiResponse[DashboardAdmin])
def dashboard_admin(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    """KPIs décisionnels (Super Admin / PDG)."""
    data = dashboard_service.dashboard_admin(db)
    return ApiResponse(success=True, data=data, message=None)


@router.get("/reception", response_model=ApiResponse[DashboardReception])
def dashboard_reception(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
):
    """KPIs opérationnels du jour (Réceptionniste)."""
    data = dashboard_service.dashboard_reception(db)
    return ApiResponse(success=True, data=data, message=None)


@router.get("/coach", response_model=ApiResponse[DashboardCoach])
def dashboard_coach(
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    """KPIs d'activité (Coach). Filtre sur le coach connecté si applicable."""
    # Si l'utilisateur est lié à un employé coach, on pourrait filtrer ici.
    data = dashboard_service.dashboard_coach(db)
    return ApiResponse(success=True, data=data, message=None)


@router.get("/alertes", response_model=ApiResponse[AlertesDashboard])
def dashboard_alertes(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(get_current_user),
    limit: int = Query(30, ge=1, le=50),
):
    """Alertes métier pour le centre de notifications (header)."""
    data = dashboard_service.alertes(db, limit=limit)
    return ApiResponse(success=True, data=data, message=None)
