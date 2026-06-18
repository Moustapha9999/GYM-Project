"""Router Administration — utilisateurs, rôles et permissions."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.common import ApiResponse
from app.schemas.tarif import TarifsRead, TarifsUpdate
from app.schemas.utilisateur import (
    PermissionRead,
    RoleDetailRead,
    RolePermissionsUpdate,
    RoleRead,
    UtilisateurCreate,
    UtilisateurRead,
    UtilisateurUpdate,
)
from app.services import audit_service, role_service, tarif_service, utilisateur_service
from app.services.tarif_service import TarifError

router = APIRouter(tags=["Administration"])


@router.get(
    "/utilisateurs",
    response_model=ApiResponse[list[UtilisateurRead]],
)
def lister_utilisateurs(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("utilisateurs.lecture")),
):
    """Liste tous les utilisateurs du système."""
    users = utilisateur_service.lister(db)
    return ApiResponse(
        success=True,
        data=[UtilisateurRead.model_validate(u) for u in users],
        message=None,
    )


@router.get(
    "/utilisateurs/{utilisateur_id}",
    response_model=ApiResponse[UtilisateurRead],
)
def detail_utilisateur(
    utilisateur_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("utilisateurs.lecture")),
):
    """Détail d'un utilisateur."""
    utilisateur = utilisateur_service.obtenir(db, utilisateur_id)
    if utilisateur is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable."
        )
    return ApiResponse(
        success=True,
        data=UtilisateurRead.model_validate(utilisateur),
        message=None,
    )


@router.post(
    "/utilisateurs",
    response_model=ApiResponse[UtilisateurRead],
    status_code=status.HTTP_201_CREATED,
)
def creer_utilisateur(
    payload: UtilisateurCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("utilisateurs.creation")),
):
    """Crée un utilisateur (réceptionniste, coach…)."""
    utilisateur = utilisateur_service.creer(db, payload)
    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="creation",
        module="utilisateurs",
        cible_table="utilisateurs",
        cible_id=utilisateur.id,
        details={"email": utilisateur.email, "role": utilisateur.role.nom},
        request=request,
    )
    db.commit()
    return ApiResponse(
        success=True,
        data=UtilisateurRead.model_validate(utilisateur),
        message=f"Utilisateur {utilisateur.prenom} {utilisateur.nom} créé avec succès.",
    )


@router.put(
    "/utilisateurs/{utilisateur_id}",
    response_model=ApiResponse[UtilisateurRead],
)
def modifier_utilisateur(
    utilisateur_id: uuid.UUID,
    payload: UtilisateurUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("utilisateurs.modification")),
):
    """Modifie un utilisateur existant."""
    utilisateur = utilisateur_service.obtenir(db, utilisateur_id)
    if utilisateur is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable."
        )
    utilisateur = utilisateur_service.modifier(db, utilisateur, payload)
    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="modification",
        module="utilisateurs",
        cible_table="utilisateurs",
        cible_id=utilisateur.id,
        request=request,
    )
    db.commit()
    return ApiResponse(
        success=True,
        data=UtilisateurRead.model_validate(utilisateur),
        message="Utilisateur modifié avec succès.",
    )


@router.delete(
    "/utilisateurs/{utilisateur_id}",
    response_model=ApiResponse[None],
)
def desactiver_utilisateur(
    utilisateur_id: uuid.UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("utilisateurs.suppression")),
):
    """Désactive un compte utilisateur."""
    utilisateur = utilisateur_service.obtenir(db, utilisateur_id)
    if utilisateur is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable."
        )
    utilisateur_service.desactiver(db, utilisateur)
    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="desactivation",
        module="utilisateurs",
        cible_table="utilisateurs",
        cible_id=utilisateur_id,
        request=request,
    )
    db.commit()
    return ApiResponse(success=True, data=None, message="Compte désactivé.")


@router.get(
    "/roles",
    response_model=ApiResponse[list[RoleRead]],
)
def lister_roles(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("roles.lecture")),
):
    """Liste les rôles disponibles."""
    roles = utilisateur_service.lister_roles(db)
    return ApiResponse(
        success=True,
        data=[RoleRead.model_validate(r) for r in roles],
        message=None,
    )


@router.get(
    "/roles/{role_id}",
    response_model=ApiResponse[RoleDetailRead],
)
def detail_role(
    role_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("roles.lecture")),
):
    """Détail d'un rôle avec ses permissions."""
    role = role_service.obtenir_role(db, role_id)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rôle introuvable."
        )
    return ApiResponse(
        success=True,
        data=RoleDetailRead.model_validate(role),
        message=None,
    )


@router.put(
    "/roles/{role_id}/permissions",
    response_model=ApiResponse[RoleDetailRead],
)
def modifier_permissions_role(
    role_id: uuid.UUID,
    payload: RolePermissionsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("roles.modification")),
):
    """Attribue les permissions à un rôle."""
    role = role_service.obtenir_role(db, role_id)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Rôle introuvable."
        )
    role = role_service.mettre_a_jour_permissions(db, role, payload.permission_ids)
    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="modification_permissions",
        module="roles",
        cible_table="roles",
        cible_id=role.id,
        details={"role": role.nom, "permissions": len(payload.permission_ids)},
        request=request,
    )
    db.commit()
    return ApiResponse(
        success=True,
        data=RoleDetailRead.model_validate(role),
        message="Permissions mises à jour.",
    )


@router.get(
    "/permissions",
    response_model=ApiResponse[list[PermissionRead]],
)
def lister_permissions(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("roles.lecture")),
):
    """Liste toutes les permissions du système."""
    permissions = role_service.lister_permissions(db)
    return ApiResponse(
        success=True,
        data=[PermissionRead.model_validate(p) for p in permissions],
        message=None,
    )


@router.get(
    "/tarifs",
    response_model=ApiResponse[TarifsRead],
)
def lire_tarifs(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("parametres.lecture")),
):
    """Tarifs séance journalière et abonnements homme / femme."""
    try:
        tarifs = tarif_service.lire_tarifs(db)
    except TarifError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return ApiResponse(success=True, data=tarifs, message=None)


@router.put(
    "/tarifs",
    response_model=ApiResponse[TarifsRead],
)
def modifier_tarifs(
    payload: TarifsUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(require_permission("parametres.modification")),
):
    """Met à jour les tarifs normaux (séance, abonnements homme et femme)."""
    try:
        tarifs = tarif_service.mettre_a_jour_tarifs(db, payload)
    except TarifError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="modification_tarifs",
        module="parametres",
        cible_table="types_abonnement",
        request=request,
    )
    db.commit()
    return ApiResponse(success=True, data=tarifs, message="Tarifs enregistrés.")
