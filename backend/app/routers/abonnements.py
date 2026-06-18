"""Router du module Abonnements."""
import uuid
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_any_role, require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.abonnement import (
    AbonnementCreate,
    AbonnementListItem,
    AbonnementRead,
    AbonnementUpdate,
    CarteInfo,
    SouscriptionResult,
    TypeAbonnementRead,
)
from app.schemas.common import ApiResponse, PaginatedResponse
from app.schemas.tarif import TarifsRead
from app.services import abonnement_service, audit_service, export_service, tarif_service
from app.services.abonnement_service import AbonnementError
from app.services.tarif_service import TarifError
from app.utils.pagination import paginate

router = APIRouter(prefix="/abonnements", tags=["Abonnements"])
types_router = APIRouter(prefix="/types-abonnements", tags=["Types abonnements"])


def _stream(contenu: bytes, media_type: str, filename: str) -> StreamingResponse:
    return StreamingResponse(
        io.BytesIO(contenu),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _to_list_item(abonnement, aujourdhui: date, delai_grace: int) -> AbonnementListItem:
    client_nom = f"{abonnement.client.prenom} {abonnement.client.nom}"
    jours_retard = 0
    en_retard = False
    hors_delai_grace = False

    if abonnement.statut == "Actif" and abonnement.date_fin < aujourdhui:
        jours_retard = (aujourdhui - abonnement.date_fin).days
        en_retard = True
        hors_delai_grace = jours_retard > delai_grace

    return AbonnementListItem(
        id=abonnement.id,
        client_id=abonnement.client_id,
        client_nom=client_nom,
        type_abonnement=abonnement.type_abonnement.nom,
        date_debut=abonnement.date_debut,
        date_fin=abonnement.date_fin,
        montant=abonnement.montant,
        statut=abonnement.statut,
        est_inscription=abonnement.est_inscription,
        created_at=abonnement.created_at,
        jours_retard=jours_retard,
        en_retard=en_retard,
        hors_delai_grace=hors_delai_grace,
    )


@router.get("", response_model=PaginatedResponse[AbonnementListItem])
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
    aujourdhui = date.today()
    delai_grace = abonnement_service.get_delai_grace_jours(db)
    return PaginatedResponse(
        success=True,
        data=[_to_list_item(a, aujourdhui, delai_grace) for a in items],
        meta=meta,
    )


@router.get("/import-modele")
def telecharger_modele_import(
    _: Utilisateur = Depends(require_permission("abonnements.lecture")),
):
    xl = export_service.generer_modele_import_abonnements()
    return _stream(
        xl,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "modele_import_abonnements.xlsx",
    )


@router.get("/formules-tarifs", response_model=ApiResponse[TarifsRead])
def lire_formules_tarifs(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("abonnements.lecture")),
):
    """Tarifs affichés au module abonnements (homme, femme, séance journalière)."""
    try:
        tarifs = tarif_service.lire_tarifs(db)
    except TarifError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return ApiResponse(success=True, data=tarifs, message=None)


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
        data=SouscriptionResult(
            abonnement=AbonnementRead.model_validate(result["abonnement"]),
            carte=CarteInfo.model_validate(result["carte"]),
            paiement_reference=result["paiement_reference"],
            montant_paye=result["montant_paye"],
            type_tarif=result["type_tarif"],
        ),
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


@router.put("/{abonnement_id}", response_model=ApiResponse[AbonnementRead])
def modifier_abonnement(
    abonnement_id: uuid.UUID,
    payload: AbonnementUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_any_role("super_admin")),
):
    """Modifie manuellement un abonnement (super administrateur uniquement)."""
    abo = abonnement_service.obtenir(db, abonnement_id)
    if abo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Abonnement introuvable.")
    try:
        abo = abonnement_service.modifier(db, abo, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="modification",
        module="abonnements",
        cible_table="abonnements",
        cible_id=abo.id,
        details=payload.model_dump(exclude_unset=True, mode="json"),
        request=request,
    )
    db.commit()
    return ApiResponse(success=True, data=AbonnementRead.model_validate(abo), message="Abonnement modifié.")


@router.delete("/{abonnement_id}", response_model=ApiResponse[None])
def supprimer_abonnement(
    abonnement_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_any_role("super_admin")),
):
    """Supprime définitivement un abonnement (super administrateur uniquement)."""
    abo = abonnement_service.obtenir(db, abonnement_id)
    if abo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Abonnement introuvable.")

    client_id = abo.client_id
    abonnement_service.supprimer(db, abo)

    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="suppression",
        module="abonnements",
        cible_table="abonnements",
        cible_id=abonnement_id,
        details={"client_id": str(client_id)},
        request=request,
    )
    db.commit()
    return ApiResponse(success=True, data=None, message="Abonnement supprimé.")


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


@types_router.get("", response_model=ApiResponse[list[TypeAbonnementRead]])
def lister_types_abonnements(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("abonnements.lecture")),
):
    """Liste des formules d'abonnement actives avec tarifs."""
    types = abonnement_service.lister_types(db)
    return ApiResponse(
        success=True,
        data=[TypeAbonnementRead.model_validate(t) for t in types],
        message=None,
    )
