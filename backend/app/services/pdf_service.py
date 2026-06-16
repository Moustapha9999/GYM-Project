"""
Service de génération de PDF (reçus de paiement, fiches de paie, cartes membres).
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


def generer_rapport_tableau(titre: str, entetes: list[str], lignes: list[list]) -> bytes:
    """Génère un PDF tabulaire générique pour les rapports."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=16 * mm, bottomMargin=14 * mm)
    styles = _styles()
    elements = []
    _entete(elements, styles, titre)

    if not lignes:
        elements.append(Paragraph("Aucune donnée pour cette période.", styles["SousTitre"]))
    else:
        data = [entetes, *lignes]
        table = Table(data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), NOIR),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ]
            )
        )
        elements.append(table)

    elements.append(Spacer(1, 6 * mm))
    elements.append(
        Paragraph(
            f"Document généré le {datetime.now().strftime('%d/%m/%Y à %H:%M')}",
            styles["SousTitre"],
        )
    )
    doc.build(elements)
    buffer.seek(0)
    return buffer.read()


def _charger_image_photo(photo_url: str | None):
    """Charge une image depuis une data URL base64 ou retourne None."""
    if not photo_url:
        return None
    try:
        import base64
        from io import BytesIO

        from PIL import Image

        if photo_url.startswith("data:"):
            _, encoded = photo_url.split(",", 1)
            raw = base64.b64decode(encoded)
        elif photo_url.startswith("http"):
            return None
        else:
            raw = base64.b64decode(photo_url)

        img = Image.open(BytesIO(raw))
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGB")
        return img
    except Exception:
        return None


def _generer_qr_image(qr_data: str):
    """Génère une image QR code PIL."""
    import qrcode

    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(qr_data)
    qr.make(fit=True)
    return qr.make_image(fill_color="#1A1A1A", back_color="white")


def _lignes_type_abonnement(type_abo: str | None) -> list[str]:
    """Découpe « Mensuel Homme » en deux lignes : « Mensuel » puis « Homme »."""
    if not type_abo or type_abo == "—":
        return ["—"]
    parts = type_abo.strip().split(None, 1)
    if len(parts) == 2:
        return [parts[0], parts[1]]
    return [type_abo]


def generer_carte_membre(carte: dict) -> bytes:
    """
    Génère un PDF de carte membre (format 171.2 × 108 mm — CR80 ×2).
    carte attendu :
      numero_membre, nom_complet, type_abonnement, date_expiration,
      qr_code_uuid, logo_url, nom_salle, statut
    """
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    card_w, card_h = 171.2 * mm, 108 * mm
    c = canvas.Canvas(buffer, pagesize=(card_w, card_h))

    # ── Fond & bordure ──────────────────────────────────────
    c.setFillColor(colors.white)
    c.rect(0, 0, card_w, card_h, fill=1, stroke=0)
    c.setStrokeColor(NOIR)
    c.setLineWidth(2)
    c.roundRect(3 * mm, 3 * mm, card_w - 6 * mm, card_h - 6 * mm, 6 * mm, fill=0, stroke=1)

    # ── Bandeau header ──────────────────────────────────────
    header_h = 22 * mm
    c.setFillColor(NOIR)
    c.roundRect(3 * mm, card_h - header_h - 3 * mm, card_w - 6 * mm, header_h, 6 * mm, fill=1, stroke=0)
    c.rect(3 * mm, card_h - header_h - 3 * mm, card_w - 6 * mm, 6 * mm, fill=1, stroke=0)

    nom_salle = carte.get("nom_salle") or "TOTAL FITNESS"
    if len(nom_salle) > 24:
        nom_salle = nom_salle[:22] + "…"

    c.setFillColor(JAUNE)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(10 * mm, card_h - header_h + 5 * mm, nom_salle)
    c.setFont("Helvetica-Bold", 13)
    c.drawRightString(card_w - 10 * mm, card_h - header_h + 5 * mm, "CARTE MEMBRE")

    # ── Zone corps ────────────────────────────────────────────
    logo_w, logo_h = 40 * mm, 48 * mm
    x_logo = 10 * mm
    y_logo = 14 * mm

    c.setFillColor(colors.white)
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(1)
    c.roundRect(x_logo, y_logo, logo_w, logo_h, 4 * mm, fill=1, stroke=1)

    logo_img = _charger_image_photo(carte.get("logo_url"))
    if logo_img:
        logo_buffer = io.BytesIO()
        logo_img.save(logo_buffer, format="PNG")
        logo_buffer.seek(0)
        padding = 3 * mm
        c.drawImage(
            ImageReader(logo_buffer),
            x_logo + padding, y_logo + padding,
            width=logo_w - 2 * padding, height=logo_h - 2 * padding,
            preserveAspectRatio=True, anchor="c", mask="auto",
        )
    else:
        c.setFillColor(colors.HexColor("#94a3b8"))
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(x_logo + logo_w / 2, y_logo + logo_h / 2 - 2 * mm, "LOGO")

    # ── Infos membre ─────────────────────────────────────────
    x_info = 56 * mm
    y_top = y_logo + logo_h - 4 * mm

    c.setFillColor(NOIR)
    c.setFont("Helvetica-Bold", 17)
    nom = carte.get("nom_complet", "—")
    if len(nom) > 28:
        nom = nom[:26] + "…"
    c.drawString(x_info, y_top, nom)

    c.setFillColor(colors.HexColor("#64748b"))
    c.setFont("Helvetica", 13)
    info_lines = [
        f"N° {carte.get('numero_membre', '—')}",
        *_lignes_type_abonnement(carte.get("type_abonnement")),
        f"Expire : {carte.get('date_expiration', '—')}",
    ]
    for i, line in enumerate(info_lines):
        c.drawString(x_info, y_top - (i + 1) * 9 * mm, line)

    # ── QR code ───────────────────────────────────────────────
    import qrcode

    qr = qrcode.QRCode(version=1, box_size=12, border=2)
    qr.add_data(carte.get("qr_code_uuid", ""))
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#1A1A1A", back_color="white")

    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)

    qr_size = 40 * mm
    x_qr = card_w - qr_size - 10 * mm
    y_qr = y_logo + (logo_h - qr_size) / 2
    c.drawImage(
        ImageReader(qr_buffer),
        x_qr, y_qr,
        width=qr_size, height=qr_size,
        preserveAspectRatio=True, mask="auto",
    )

    # ── Footer ────────────────────────────────────────────────
    statut = carte.get("statut", "Actif")
    statut_color = colors.HexColor("#166534") if statut == "Actif" else colors.HexColor("#991b1b")
    c.setFillColor(statut_color)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(10 * mm, 7 * mm, f"● {statut}")
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.setFont("Helvetica", 10)
    c.drawString(36 * mm, 7 * mm, "Discipline · Force · Résultats — Nouakchott")

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.read()
