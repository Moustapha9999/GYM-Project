"""Router du module Paiements (journal + caisse du jour)."""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.common import ApiResponse
from app.schemas.paiement import (
    CaisseJour,
    MoyenPaiementRead,
    PaiementCreate,
    PaiementCreateResult,
    PaiementDetail,
    PaiementRead,
)
from app.services import paiement_service
from app.services.paiement_service import PaiementError
from app.models.moyen_paiement import MoyenPaiement

router = APIRouter(prefix="/paiements", tags=["Paiements"])


@router.get("", response_model=ApiResponse[list[PaiementDetail]])
def journal_paiements(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("paiements.lecture")),
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    moyen_paiement_id: uuid.UUID | None = Query(None),
    type_paiement: str | None = Query(None, description="Abonnement / Séance journalière / ..."),
):
    """Journal des paiements (filtres date, moyen, type)."""
    data = paiement_service.lister_detail(
        db,
        date_debut=date_debut,
        date_fin=date_fin,
        moyen_paiement_id=moyen_paiement_id,
        type_paiement=type_paiement,
    )
    return ApiResponse(success=True, data=data, message=None)


@router.post("", response_model=ApiResponse[PaiementCreateResult], status_code=status.HTTP_201_CREATED)
def creer_paiement(
    payload: PaiementCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("paiements.creation")),
):
    """Enregistre un nouveau paiement (abonnement, séance ou encaissement manuel)."""
    try:
        result = paiement_service.creer(
            db,
            type_paiement=payload.type_paiement,
            moyen_paiement_id=payload.moyen_paiement_id,
            encaisse_par=current_user.id,
            client_id=payload.client_id,
            nom_client_occasionnel=payload.nom_client_occasionnel,
            montant=payload.montant,
        )
    except PaiementError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=PaiementCreateResult.model_validate(result),
        message=f"Paiement {result['paiement_reference']} enregistré — {result['montant']} MRU",
    )


@router.get("/moyens-paiement", response_model=ApiResponse[list[MoyenPaiementRead]])
def lister_moyens_paiement(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("paiements.lecture")),
):
    """Liste des moyens de paiement actifs (Bankily, Cash, etc.)."""
    moyens = (
        db.query(MoyenPaiement)
        .filter(MoyenPaiement.actif == True)  # noqa: E712
        .order_by(MoyenPaiement.libelle)
        .all()
    )
    return ApiResponse(
        success=True,
        data=[MoyenPaiementRead.model_validate(m) for m in moyens],
        message=None,
    )


@router.get("/caisse-jour", response_model=ApiResponse[CaisseJour])
def caisse_jour(
    jour: date | None = Query(None, description="Jour (défaut : aujourd'hui)"),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("paiements.lecture")),
):
    """Synthèse de la caisse du jour : total, répartition par moyen de paiement."""
    data = paiement_service.caisse_du_jour(db, jour)
    return ApiResponse(success=True, data=data, message=None)


@router.get("/{paiement_id}", response_model=ApiResponse[PaiementRead])
def detail_paiement(
    paiement_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("paiements.lecture")),
):
    """Détail d'un paiement."""
    paiement = paiement_service.obtenir(db, paiement_id)
    if paiement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paiement introuvable.")
    return ApiResponse(success=True, data=PaiementRead.model_validate(paiement))
