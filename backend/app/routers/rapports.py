"""Router des Rapports / Exports (PDF et Excel)."""
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.models.employe import Employe
from app.models.fiche_paie import FichePaie
from app.models.utilisateur import Utilisateur
from app.services import client_service, paiement_service, pdf_service, export_service

router = APIRouter(prefix="/rapports", tags=["Rapports / Exports"])


def _stream(contenu: bytes, media_type: str, filename: str) -> StreamingResponse:
    import io
    return StreamingResponse(
        io.BytesIO(contenu),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Reçu PDF d'un paiement ──────────────────────────────────
@router.get("/paiements/{paiement_id}/recu-pdf")
def recu_pdf(
    paiement_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("paiements.export")),
):
    paiement = paiement_service.obtenir(db, paiement_id)
    if paiement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paiement introuvable.")

    # Construire le dict pour le PDF
    from app.models.moyen_paiement import MoyenPaiement
    from app.models.client import Client
    moyen = db.query(MoyenPaiement).filter(MoyenPaiement.id == paiement.moyen_paiement_id).first()
    client_nom = "—"
    if paiement.client_id:
        c = db.query(Client).filter(Client.id == paiement.client_id).first()
        if c:
            client_nom = f"{c.prenom} {c.nom}"

    data = {
        "reference": paiement.reference,
        "date_paiement": paiement.date_paiement.strftime("%d/%m/%Y %H:%M"),
        "client_nom": client_nom,
        "type_paiement": paiement.type_paiement,
        "montant": str(paiement.montant),
        "moyen_paiement": moyen.libelle if moyen else "—",
        "encaisse_par": "—",
    }
    pdf = pdf_service.generer_recu_paiement(data)
    return _stream(pdf, "application/pdf", f"recu_{paiement.reference}.pdf")


# ── Fiche de paie PDF ───────────────────────────────────────
@router.get("/fiches-paie/{fiche_id}/pdf")
def fiche_paie_pdf(
    fiche_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("salaires.export")),
):
    fiche = db.query(FichePaie).filter(FichePaie.id == fiche_id).first()
    if fiche is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fiche introuvable.")
    employe = db.query(Employe).filter(Employe.id == fiche.employe_id).first()

    data = {
        "employe_nom": f"{employe.prenom} {employe.nom}" if employe else "—",
        "fonction": employe.fonction if employe else "—",
        "mois": fiche.mois,
        "annee": fiche.annee,
        "salaire_base": str(fiche.salaire_base),
        "primes": str(fiche.primes),
        "bonus": str(fiche.bonus),
        "retenues": str(fiche.retenues),
        "salaire_final": str(fiche.salaire_final),
        "statut_paiement": fiche.statut_paiement,
    }
    pdf = pdf_service.generer_fiche_paie(data)
    return _stream(pdf, "application/pdf", f"fiche_paie_{fiche.mois}_{fiche.annee}.pdf")


# ── Export Excel des paiements ──────────────────────────────
@router.get("/export/paiements-excel")
def export_paiements_excel(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("paiements.export")),
):
    paiements = paiement_service.lister_detail(db, date_debut=date_debut, date_fin=date_fin)
    # convertir date_paiement en str
    for p in paiements:
        p["date_paiement"] = p["date_paiement"].strftime("%d/%m/%Y %H:%M")
    xl = export_service.exporter_paiements(paiements)
    return _stream(
        xl,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "paiements.xlsx",
    )


# ── Export Excel des clients ────────────────────────────────
@router.get("/export/clients-excel")
def export_clients_excel(
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("clients.export")),
):
    query = client_service.lister(db)
    clients = [
        {
            "numero_membre": c.numero_membre, "nom": c.nom, "prenom": c.prenom,
            "sexe": c.sexe, "telephone": c.telephone, "email": c.email, "actif": c.actif,
        }
        for c in query.all()
    ]
    xl = export_service.exporter_clients(clients)
    return _stream(
        xl,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "clients.xlsx",
    )
