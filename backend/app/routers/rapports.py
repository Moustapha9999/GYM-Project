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
from app.schemas.common import ApiResponse
from app.schemas.rapport import (
    FichePaieRapportRead,
    JournalAuditRead,
    JournalCaisseRead,
    JournalClientRead,
)
from app.services import (
    client_service,
    export_service,
    paiement_service,
    pdf_service,
    rapport_service,
)

router = APIRouter(prefix="/rapports", tags=["Rapports / Exports"])


def _stream(contenu: bytes, media_type: str, filename: str) -> StreamingResponse:
    import io
    return StreamingResponse(
        io.BytesIO(contenu),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _fmt_date(value):
    return value.strftime("%d/%m/%Y") if value else "—"


def _fmt_datetime(value):
    return value.strftime("%d/%m/%Y %H:%M") if value else "—"


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


# ── Rapports détaillés (liste + filtres date) ───────────────
@router.get("/fiches-paie", response_model=ApiResponse[list[FichePaieRapportRead]])
def rapport_fiches_paie(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("salaires.lecture")),
):
    data = rapport_service.lister_fiches_paie(db, date_debut=date_debut, date_fin=date_fin)
    return ApiResponse(success=True, data=data)


@router.get("/journal-audit", response_model=ApiResponse[list[JournalAuditRead]])
def rapport_journal_audit(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    module: str | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("audit.lecture")),
):
    data = rapport_service.lister_journal_audit(db, date_debut=date_debut, date_fin=date_fin, module=module)
    return ApiResponse(success=True, data=data)


@router.get("/journal-caisse", response_model=ApiResponse[list[JournalCaisseRead]])
def rapport_journal_caisse(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("finances.lecture")),
):
    data = rapport_service.lister_journal_caisse(db, date_debut=date_debut, date_fin=date_fin)
    return ApiResponse(success=True, data=data)


@router.get("/journal-clients", response_model=ApiResponse[list[JournalClientRead]])
def rapport_journal_clients(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("clients.lecture")),
):
    data = rapport_service.lister_journal_clients(db, date_debut=date_debut, date_fin=date_fin)
    return ApiResponse(success=True, data=data)


# ── Exports détaillés Excel/PDF ─────────────────────────────
@router.get("/fiches-paie/export/excel")
def export_fiches_paie_excel(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("salaires.export")),
):
    data = rapport_service.lister_fiches_paie(db, date_debut=date_debut, date_fin=date_fin)
    entetes = [
        "Employé",
        "Fonction",
        "Période",
        "Salaire base",
        "Primes",
        "Bonus",
        "Retenues",
        "Net",
        "Statut",
        "Paiement le",
    ]
    lignes = [
        [
            row["employe_nom"],
            row["fonction"] or "—",
            f'{row["mois"]:02d}/{row["annee"]}',
            float(row["salaire_base"]),
            float(row["primes"]),
            float(row["bonus"]),
            float(row["retenues"]),
            float(row["salaire_final"] or 0),
            row["statut_paiement"],
            _fmt_date(row["date_paiement"]),
        ]
        for row in data
    ]
    xl = export_service.exporter_rapport_detaille("Fiches de paie", entetes, lignes)
    return _stream(
        xl,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "rapport_fiches_paie.xlsx",
    )


@router.get("/fiches-paie/export/pdf")
def export_fiches_paie_pdf(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("salaires.export")),
):
    data = rapport_service.lister_fiches_paie(db, date_debut=date_debut, date_fin=date_fin)
    entetes = ["Employé", "Période", "Net MRU", "Statut", "Date paiement"]
    lignes = [
        [
            row["employe_nom"],
            f'{row["mois"]:02d}/{row["annee"]}',
            f'{row["salaire_final"] or 0}',
            row["statut_paiement"],
            _fmt_date(row["date_paiement"]),
        ]
        for row in data
    ]
    pdf = pdf_service.generer_rapport_tableau("RAPPORT FICHES DE PAIE", entetes, lignes)
    return _stream(pdf, "application/pdf", "rapport_fiches_paie.pdf")


@router.get("/journal-audit/export/excel")
def export_journal_audit_excel(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    module: str | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("audit.export")),
):
    data = rapport_service.lister_journal_audit(db, date_debut=date_debut, date_fin=date_fin, module=module)
    entetes = ["Date", "Action", "Module", "Utilisateur", "Rôle", "IP", "Table", "Cible ID"]
    lignes = [
        [
            _fmt_datetime(row["created_at"]),
            row["action"],
            row["module"],
            row["utilisateur_nom"] or "—",
            row["role_nom"] or "—",
            row["adresse_ip"] or "—",
            row["cible_table"] or "—",
            str(row["cible_id"] or "—"),
        ]
        for row in data
    ]
    xl = export_service.exporter_rapport_detaille("Journal audit", entetes, lignes)
    return _stream(
        xl,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "rapport_journal_audit.xlsx",
    )


@router.get("/journal-audit/export/pdf")
def export_journal_audit_pdf(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    module: str | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("audit.export")),
):
    data = rapport_service.lister_journal_audit(db, date_debut=date_debut, date_fin=date_fin, module=module)
    entetes = ["Date", "Action", "Module", "Utilisateur", "IP"]
    lignes = [
        [
            _fmt_datetime(row["created_at"]),
            row["action"],
            row["module"],
            row["utilisateur_nom"] or "—",
            row["adresse_ip"] or "—",
        ]
        for row in data
    ]
    pdf = pdf_service.generer_rapport_tableau("RAPPORT JOURNAL D'AUDIT", entetes, lignes)
    return _stream(pdf, "application/pdf", "rapport_journal_audit.pdf")


@router.get("/journal-caisse/export/excel")
def export_journal_caisse_excel(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("finances.export")),
):
    data = rapport_service.lister_journal_caisse(db, date_debut=date_debut, date_fin=date_fin)
    entetes = ["Date", "Encaisse", "Dépenses", "Solde", "Statut", "Clôturé par", "Clôturé le"]
    lignes = [
        [
            _fmt_date(row["date_jour"]),
            float(row["total_encaisse"]),
            float(row["total_depenses"]),
            float(row["solde"]),
            row["statut"],
            row["cloture_par_nom"] or "—",
            _fmt_datetime(row["cloture_le"]),
        ]
        for row in data
    ]
    xl = export_service.exporter_rapport_detaille("Journal caisse", entetes, lignes)
    return _stream(
        xl,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "rapport_journal_caisse.xlsx",
    )


@router.get("/journal-caisse/export/pdf")
def export_journal_caisse_pdf(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("finances.export")),
):
    data = rapport_service.lister_journal_caisse(db, date_debut=date_debut, date_fin=date_fin)
    entetes = ["Date", "Encaisse", "Dépenses", "Solde", "Statut"]
    lignes = [
        [
            _fmt_date(row["date_jour"]),
            float(row["total_encaisse"]),
            float(row["total_depenses"]),
            float(row["solde"]),
            row["statut"],
        ]
        for row in data
    ]
    pdf = pdf_service.generer_rapport_tableau("RAPPORT JOURNAL DE CAISSE", entetes, lignes)
    return _stream(pdf, "application/pdf", "rapport_journal_caisse.pdf")


@router.get("/journal-clients/export/excel")
def export_journal_clients_excel(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("clients.export")),
):
    data = rapport_service.lister_journal_clients(db, date_debut=date_debut, date_fin=date_fin)
    entetes = [
        "N° Membre",
        "Nom",
        "Téléphone",
        "Email",
        "Statut",
        "Inscrit le",
        "Dernière présence",
        "Fin dernier abonnement",
    ]
    lignes = [
        [
            row["numero_membre"],
            f'{row["prenom"]} {row["nom"]}',
            row["telephone"],
            row["email"] or "—",
            "Actif" if row["actif"] else "Inactif",
            _fmt_datetime(row["created_at"]),
            _fmt_datetime(row["derniere_presence"]),
            _fmt_date(row["dernier_abonnement_fin"]),
        ]
        for row in data
    ]
    xl = export_service.exporter_rapport_detaille("Journal clients", entetes, lignes)
    return _stream(
        xl,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "rapport_journal_clients.xlsx",
    )


@router.get("/journal-clients/export/pdf")
def export_journal_clients_pdf(
    date_debut: date | None = Query(None),
    date_fin: date | None = Query(None),
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_permission("clients.export")),
):
    data = rapport_service.lister_journal_clients(db, date_debut=date_debut, date_fin=date_fin)
    entetes = ["N° Membre", "Nom", "Statut", "Inscrit le", "Dernière présence"]
    lignes = [
        [
            row["numero_membre"],
            f'{row["prenom"]} {row["nom"]}',
            "Actif" if row["actif"] else "Inactif",
            _fmt_datetime(row["created_at"]),
            _fmt_datetime(row["derniere_presence"]),
        ]
        for row in data
    ]
    pdf = pdf_service.generer_rapport_tableau("RAPPORT JOURNAL CLIENTS", entetes, lignes)
    return _stream(pdf, "application/pdf", "rapport_journal_clients.pdf")
