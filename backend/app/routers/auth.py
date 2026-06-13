"""Router d'authentification : login et profil courant."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_user_permissions
from app.models.utilisateur import Utilisateur
from app.schemas.auth import LoginRequest, TokenData, UtilisateurInfo
from app.schemas.common import ApiResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/login", response_model=ApiResponse[TokenData])
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authentifie un utilisateur et retourne un token JWT."""
    result = auth_service.authenticate(db, payload.email, payload.password)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )

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
def logout(current_user: Utilisateur = Depends(get_current_user)):
    """
    Déconnexion. Avec JWT stateless, la déconnexion est gérée côté client
    (suppression du token). Cet endpoint sert de point de sortie standardisé.
    """
    return ApiResponse(success=True, data=None, message="Déconnexion réussie")
