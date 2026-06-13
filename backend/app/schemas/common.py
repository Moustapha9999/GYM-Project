"""Schémas Pydantic communs — réponse API standardisée."""
from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Réponse standardisée de l'API (succès)."""
    success: bool = True
    data: T | None = None
    message: str | None = None


class PaginationMeta(BaseModel):
    current_page: int
    per_page: int
    total: int
    last_page: int


class PaginatedResponse(BaseModel, Generic[T]):
    """Réponse paginée standardisée."""
    success: bool = True
    data: list[T]
    meta: PaginationMeta
    message: str | None = None
