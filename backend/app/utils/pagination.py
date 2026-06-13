"""Helper de pagination réutilisable pour tous les modules."""
from math import ceil

from sqlalchemy.orm import Query

from app.schemas.common import PaginationMeta


def paginate(query: Query, page: int, per_page: int):
    """
    Pagine une requête SQLAlchemy.
    Retourne (items, meta).
    """
    page = max(page, 1)
    per_page = max(min(per_page, 100), 1)  # borne entre 1 et 100

    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    last_page = max(ceil(total / per_page), 1)

    meta = PaginationMeta(
        current_page=page,
        per_page=per_page,
        total=total,
        last_page=last_page,
    )
    return items, meta
