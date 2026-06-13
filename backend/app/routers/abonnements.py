"""Router du module Abonnements."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.abonnement import AbonnementCreate, AbonnementRead, SouscriptionResult
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services import abonnement_service
from app.services.abonnement_service import AbonnementError
from app.utils.pagination import paginate

router = APIRouter(prefix="/abonnements", tags=["Abonnements"])


@router.get("", response_model=PaginatedResponse[AbonnementRead])
def lister_abonnements(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("abonnements.lecture")),
    client_id: uuid.UUID | None = Query(None),
    statut: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Liste paginée des abonnements."""
    query = abonnement_service.lister(db, client_id=client_id, statut=statut)
    items, meta = paginate(query, page, per_page)
    return PaginatedResponse(
        success=True,
        data=[AbonnementRead.model_validate(a) for a in items],
        meta=meta,
    )


@router.post(
    "/souscrire",
    response_model=ApiResponse[SouscriptionResult],
    status_code=status.HTTP_201_CREATED,
)
def souscrire(
    payload: AbonnementCreate,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("abonnements.creation")),
):
    """
    Souscrit ou renouvelle un abonnement.
    Type choisi auto selon le sexe, tarif inscription/renouvellement appliqué,
    paiement enregistré et carte QR générée.
    """
    try:
        result = abonnement_service.souscrire(
            db,
            client_id=payload.client_id,
            moyen_paiement_id=payload.moyen_paiement_id,
            encaisse_par=current_user.id,
        )
    except AbonnementError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ApiResponse(
        success=True,
        data=result,
        message=f"Abonnement {result['type_tarif']} créé — {result['montant_paye']} MRU",
    )


@router.get("/client/{client_id}/actuel", response_model=ApiResponse[AbonnementRead])
def abonnement_actuel(
    client_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("abonnements.lecture")),
):
    """Retourne l'abonnement le plus récent du client."""
    abo = abonnement_service.abonnement_actuel(db, client_id)
    if abo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aucun abonnement.")
    return ApiResponse(success=True, data=AbonnementRead.model_validate(abo))


@router.get("/client/{client_id}/eligibilite", response_model=ApiResponse[dict])
def verifier_eligibilite(
    client_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("abonnements.lecture")),
):
    """
    Vérifie la règle des 3 jours : le client peut-il renouveler au tarif normal
    ou doit-il passer par une séance journalière ?
    """
    result = abonnement_service.peut_renouveler_au_tarif_normal(db, client_id)
    return ApiResponse(success=True, data=result)


@router.patch("/{abonnement_id}/suspendre", response_model=ApiResponse[AbonnementRead])
def suspendre(
    abonnement_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("abonnements.modification")),
):
    abo = abonnement_service.obtenir(db, abonnement_id)
    if abo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Abonnement introuvable.")
    abo = abonnement_service.suspendre(db, abo)
    return ApiResponse(success=True, data=AbonnementRead.model_validate(abo), message="Abonnement suspendu.")


@router.patch("/{abonnement_id}/resilier", response_model=ApiResponse[AbonnementRead])
def resilier(
    abonnement_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("abonnements.modification")),
):
    abo = abonnement_service.obtenir(db, abonnement_id)
    if abo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Abonnement introuvable.")
    abo = abonnement_service.resilier(db, abo)
    return ApiResponse(success=True, data=AbonnementRead.model_validate(abo), message="Abonnement résilié.")
