"""Validation des uploads (taille, type MIME)."""
import base64
import re

MAX_EXCEL_BYTES = 5 * 1024 * 1024
MAX_IMAGE_BYTES = 2 * 1024 * 1024
_ALLOWED_IMAGE_MIMES = frozenset(
    {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
)
_DATA_URL_RE = re.compile(r"^data:(image/[a-zA-Z0-9.+-]+);base64,", re.IGNORECASE)


def validate_excel_size(content: bytes) -> None:
    if len(content) > MAX_EXCEL_BYTES:
        raise ValueError(
            f"Fichier trop volumineux (max {MAX_EXCEL_BYTES // (1024 * 1024)} Mo)."
        )


def validate_image_data_url(value: str, *, field_name: str = "Image") -> str:
    """Valide une data URL image (taille + MIME autorisé)."""
    raw = (value or "").strip()
    if not raw:
        return raw

    mime = "image/jpeg"
    payload = raw

    match = _DATA_URL_RE.match(raw)
    if match:
        mime = match.group(1).lower()
        payload = raw[match.end() :]
    elif raw.startswith("http://") or raw.startswith("https://"):
        return raw

    if mime not in _ALLOWED_IMAGE_MIMES:
        raise ValueError(f"{field_name} : format non autorisé ({mime}).")

    try:
        decoded = base64.b64decode(payload, validate=True)
    except Exception as exc:
        raise ValueError(f"{field_name} : contenu base64 invalide.") from exc

    if len(decoded) > MAX_IMAGE_BYTES:
        raise ValueError(
            f"{field_name} trop volumineuse (max {MAX_IMAGE_BYTES // (1024 * 1024)} Mo)."
        )

    if not match:
        return f"data:{mime};base64,{payload}"
    return raw
