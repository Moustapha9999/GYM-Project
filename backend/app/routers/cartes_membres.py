"""Router du module Cartes membres."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.utilisateur import Utilisateur
from app.schemas.carte_membre import CarteMembreListItem, CarteMembreRead, EnvoiWhatsappResult
from app.schemas.common import ApiResponse, PaginatedResponse
from app.services import carte_membre_service, message_service, notification_service, pdf_service
from app.services.message_service import MessageError
from app.utils.pagination import paginate

router = APIRouter(prefix="/cartes-membres", tags=["Cartes membres"])


def _stream(contenu: bytes, media_type: str, filename: str) -> StreamingResponse:
    import io

    return StreamingResponse(
        io.BytesIO(contenu),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("", response_model=PaginatedResponse[CarteMembreListItem])
def lister_cartes(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("cartes_membres.lecture")),
    statut: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Liste paginée des cartes membres (clients inscrits par défaut)."""
    query = carte_membre_service.lister(db, statut=statut, search=search)
    items, meta = paginate(query, page, per_page)
    return PaginatedResponse(
        success=True,
        data=[CarteMembreListItem(**carte_membre_service.to_list_item(c)) for c in items],
        meta=meta,
    )


@router.get("/{carte_id}", response_model=ApiResponse[CarteMembreListItem])
def obtenir_carte(
    carte_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("cartes_membres.lecture")),
):
    """Détail d'une carte membre."""
    carte = carte_membre_service.obtenir(db, carte_id)
    if carte is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carte introuvable.")
    return ApiResponse(
        success=True,
        data=CarteMembreListItem(**carte_membre_service.to_list_item(carte)),
    )


@router.get("/{carte_id}/pdf")
def telecharger_pdf(
    carte_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("cartes_membres.lecture")),
):
    """Télécharge la carte membre au format PDF."""
    carte = carte_membre_service.obtenir(db, carte_id)
    if carte is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carte introuvable.")

    data = carte_membre_service.construire_donnees_pdf(db, carte)
    pdf = pdf_service.generer_carte_membre(data)
    filename = f"carte_{carte.client.numero_membre}.pdf"
    return _stream(pdf, "application/pdf", filename)


@router.post("/{carte_id}/envoyer-whatsapp", response_model=ApiResponse[EnvoiWhatsappResult])
def envoyer_whatsapp(
    carte_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("cartes_membres.validation")),
):
    """Envoie la carte membre en PDF via WhatsApp au client."""
    carte = carte_membre_service.obtenir(db, carte_id)
    if carte is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Carte introuvable.")

    client = carte.client
    numero = client.whatsapp or client.telephone
    if not numero:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun numéro WhatsApp ou téléphone renseigné pour ce client.",
        )

    data = carte_membre_service.construire_donnees_pdf(db, carte)
    pdf = pdf_service.generer_carte_membre(data)
    filename = f"carte_{client.numero_membre}.pdf"

    try:
        message_data = message_service.generer(db, client.id, "carte_prete")
    except MessageError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    caption = message_data["texte"]

    notif = notification_service.envoyer_document(
        db,
        destinataire_type="client",
        numero_telephone=numero,
        type_notification="carte_membre",
        message=caption,
        document_bytes=pdf,
        filename=filename,
        client_id=client.id,
    )

    if notif.statut != "Envoyé":
        return ApiResponse(
            success=True,
            data=EnvoiWhatsappResult(
                statut="Manuel",
                numero=numero,
                message=caption,
                lien_whatsapp=message_data.get("lien_whatsapp"),
            ),
            message=(
                "Envoi automatique indisponible. Le PDF sera téléchargé et WhatsApp "
                "s'ouvrira avec le message prérempli — joignez le PDF manuellement."
            ),
        )

    return ApiResponse(
        success=True,
        data=EnvoiWhatsappResult(
            statut=notif.statut,
            numero=numero,
            message=caption,
        ),
        message="Carte et message envoyés via WhatsApp.",
    )
