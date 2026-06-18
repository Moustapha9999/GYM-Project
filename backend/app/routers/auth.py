"""Router d'authentification : login et profil courant."""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_user_permissions
from app.core.rate_limit import check_login_rate_limit, clear_login_attempts, record_login_failure
from app.models.utilisateur import Utilisateur
from app.schemas.auth import LoginRequest, TokenData, UtilisateurInfo
from app.schemas.common import ApiResponse
from app.services import audit_service, auth_service

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/login", response_model=ApiResponse[TokenData])
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authentifie un utilisateur et retourne un token JWT."""
    check_login_rate_limit(request, payload.email)
    result = auth_service.authenticate(db, payload.email, payload.password)

    if result is None:
        record_login_failure(request, payload.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )

    clear_login_attempts(request, payload.email)
    user_id = result["utilisateur"]["id"]
    audit_service.enregistrer(
        db,
        utilisateur_id=user_id,
        action="connexion",
        module="auth",
        cible_table="utilisateurs",
        cible_id=user_id,
        request=request,
    )
    db.commit()

    return ApiResponse(
        success=True,
        data=result,
        message="Connexion réussie",
    )


@router.get("/me", response_model=ApiResponse[UtilisateurInfo])
def me(current_user: Utilisateur = Depends(get_current_user)):
    """Retourne les informations de l'utilisateur connecté."""
    data = {
        "id": current_user.id,
        "nom": current_user.nom,
        "prenom": current_user.prenom,
        "email": current_user.email,
        "role": {"nom": current_user.role.nom, "libelle": current_user.role.libelle},
        "permissions": get_user_permissions(current_user),
    }
    return ApiResponse(success=True, data=data, message=None)


@router.post("/logout", response_model=ApiResponse[None])
def logout(
    request: Request,
    current_user: Utilisateur = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Déconnexion. Avec JWT stateless, la déconnexion est gérée côté client
    (suppression du token). Cet endpoint sert de point de sortie standardisé.
    """
    audit_service.enregistrer(
        db,
        utilisateur_id=current_user.id,
        action="deconnexion",
        module="auth",
        cible_table="utilisateurs",
        cible_id=current_user.id,
        request=request,
    )
    db.commit()
    return ApiResponse(success=True, data=None, message="Déconnexion réussie")
