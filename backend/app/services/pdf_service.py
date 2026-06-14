"""
Service de génération de PDF (reçus de paiement, fiches de paie).
Utilise ReportLab. Retourne les PDF sous forme de bytes (à streamer ou stocker).
"""
import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
)

JAUNE = colors.HexColor("#F2B705")
NOIR = colors.HexColor("#1A1A1A")


def _styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("TitreTF", parent=styles["Title"], textColor=NOIR, fontSize=22))
    styles.add(ParagraphStyle("SousTitre", parent=styles["Normal"], textColor=colors.grey, fontSize=10))
    styles.add(ParagraphStyle("Label", parent=styles["Normal"], fontSize=10, textColor=colors.grey))
    return styles


def _entete(elements, styles, titre: str):
    elements.append(Paragraph("TOTAL FITNESS", styles["TitreTF"]))
    elements.append(Paragraph("Discipline · Force · Résultats — Nouakchott", styles["SousTitre"]))
    elements.append(Spacer(1, 8 * mm))
    elements.append(Paragraph(titre, styles["Heading2"]))
    elements.append(Spacer(1, 4 * mm))


def generer_recu_paiement(paiement: dict) -> bytes:
    """
    paiement attendu (dict) :
      reference, date_paiement, client_nom, type_paiement,
      montant, moyen_paiement, encaisse_par
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = _styles()
    elements = []

    _entete(elements, styles, "REÇU DE PAIEMENT")

    lignes = [
        ["Référence", paiement.get("reference", "—")],
        ["Date", paiement.get("date_paiement", "—")],
        ["Client", paiement.get("client_nom", "—")],
        ["Type", paiement.get("type_paiement", "—")],
        ["Moyen de paiement", paiement.get("moyen_paiement", "—")],
        ["Encaissé par", paiement.get("encaisse_par", "—")],
    ]
    t = Table(lignes, colWidths=[55 * mm, 105 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.lightgrey),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 8 * mm))

    # Montant en vedette
    montant = paiement.get("montant", "0")
    montant_table = Table([["MONTANT PAYÉ", f"{montant} MRU"]], colWidths=[80 * mm, 80 * mm])
    montant_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), JAUNE),
        ("FONTSIZE", (0, 0), (-1, -1), 14),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 0), (-1, -1), NOIR),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ("LEFTPADDING", (0, 0), (0, 0), 12),
        ("RIGHTPADDING", (1, 0), (1, 0), 12),
    ]))
    elements.append(montant_table)
    elements.append(Spacer(1, 12 * mm))
    elements.append(Paragraph(
        f"Document généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}",
        styles["SousTitre"],
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()


def generer_fiche_paie(fiche: dict) -> bytes:
    """
    fiche attendue (dict) :
      employe_nom, fonction, mois, annee,
      salaire_base, primes, bonus, retenues, salaire_final, statut_paiement
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm)
    styles = _styles()
    elements = []

    _entete(elements, styles, f"FICHE DE PAIE — {fiche.get('mois')}/{fiche.get('annee')}")

    info = [
        ["Employé", fiche.get("employe_nom", "—")],
        ["Fonction", fiche.get("fonction", "—")],
        ["Période", f"{fiche.get('mois')}/{fiche.get('annee')}"],
        ["Statut", fiche.get("statut_paiement", "—")],
    ]
    t = Table(info, colWidths=[55 * mm, 105 * mm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.grey),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -1), 0.3, colors.lightgrey),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 8 * mm))

    # Détail du salaire
    detail = [
        ["Élément", "Montant (MRU)"],
        ["Salaire de base", str(fiche.get("salaire_base", "0"))],
        ["Primes", f"+ {fiche.get('primes', '0')}"],
        ["Bonus", f"+ {fiche.get('bonus', '0')}"],
        ["Retenues", f"- {fiche.get('retenues', '0')}"],
        ["SALAIRE NET", str(fiche.get("salaire_final", "0"))],
    ]
    dt = Table(detail, colWidths=[100 * mm, 60 * mm])
    dt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NOIR),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, -1), (-1, -1), JAUNE),
        ("TEXTCOLOR", (0, -1), (-1, -1), NOIR),
        ("FONTSIZE", (0, 0), (-1, -1), 11),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
    ]))
    elements.append(dt)
    elements.append(Spacer(1, 12 * mm))
    elements.append(Paragraph(
        f"Document généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}",
        styles["SousTitre"],
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
