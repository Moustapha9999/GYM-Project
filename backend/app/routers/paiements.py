"""Router du module Paiements (journal + caisse du jour)."""
import uuid
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
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
    PaiementUpdate,
)
from app.services import audit_service, export_service, paiement_service
from app.services.paiement_service import PaiementError
from app.models.moyen_paiement import MoyenPaiement

router = APIRouter(prefix="/paiements", tags=["Paiements"])


def _stream(contenu: bytes, media_type: str, filename: str) -> StreamingResponse:
    return StreamingResponse(
        io.BytesIO(contenu),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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


@router.get("/import-modele")
def telecharger_modele_import(
    _: Utilisateur = Depends(require_permission("paiements.lecture")),
):
    xl = export_service.generer_modele_import_paiements()
    return _stream(
        xl,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "modele_import_paiements.xlsx",
    )


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


@router.put("/{paiement_id}", response_model=ApiResponse[PaiementRead])
def modifier_paiement(
    paiement_id: uuid.UUID,
    payload: PaiementUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("paiements.modification")),
):
    """Modifie un paiement (montant, moyen de paiement, statut)."""
    paiement = paiement_service.obtenir(db, paiement_id)
    if paiement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paiement introuvable.")
    try:
        paiement = paiement_service.modifier(db, paiement, payload)
    except PaiementError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="modification",
        module="paiements",
        cible_table="paiements",
        cible_id=paiement.id,
        details=payload.model_dump(exclude_unset=True, mode="json"),
        request=request,
    )
    db.commit()
    return ApiResponse(success=True, data=PaiementRead.model_validate(paiement), message="Paiement modifié.")
