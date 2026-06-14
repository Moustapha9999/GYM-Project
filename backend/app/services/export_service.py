"""Service d'export Excel (openpyxl). Retourne les fichiers en bytes."""
import io
from datetime import date

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

JAUNE = "FFF2B705"
ENTETE_FONT = Font(bold=True, color="FF1A1A1A")
ENTETE_FILL = PatternFill(start_color=JAUNE, end_color=JAUNE, fill_type="solid")


def _styliser_entete(ws, nb_colonnes: int):
    for col in range(1, nb_colonnes + 1):
        cell = ws.cell(row=1, column=col)
        cell.font = ENTETE_FONT
        cell.fill = ENTETE_FILL
        cell.alignment = Alignment(horizontal="center")


def exporter_paiements(paiements: list[dict]) -> bytes:
    """paiements : liste de dicts (reference, date, client, type, montant, moyen, statut)."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Paiements"

    entetes = ["Référence", "Date", "Client", "Type", "Montant (MRU)", "Moyen", "Statut"]
    ws.append(entetes)
    _styliser_entete(ws, len(entetes))

    for p in paiements:
        ws.append([
            p.get("reference", ""),
            str(p.get("date_paiement", "")),
            p.get("client_nom", ""),
            p.get("type_paiement", ""),
            float(p.get("montant", 0)),
            p.get("moyen_paiement", ""),
            p.get("statut", ""),
        ])

    # Largeurs de colonnes
    for col, larg in zip("ABCDEFG", [22, 20, 25, 20, 15, 15, 12]):
        ws.column_dimensions[col].width = larg

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.read()


def exporter_clients(clients: list[dict]) -> bytes:
    """clients : liste de dicts."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Clients"

    entetes = ["N° Membre", "Nom", "Prénom", "Sexe", "Téléphone", "Email", "Actif"]
    ws.append(entetes)
    _styliser_entete(ws, len(entetes))

    for c in clients:
        ws.append([
            c.get("numero_membre", ""),
            c.get("nom", ""),
            c.get("prenom", ""),
            c.get("sexe", ""),
            c.get("telephone", ""),
            c.get("email", ""),
            "Oui" if c.get("actif") else "Non",
        ])

    for col, larg in zip("ABCDEFG", [16, 18, 18, 10, 16, 25, 8]):
        ws.column_dimensions[col].width = larg

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.read()
