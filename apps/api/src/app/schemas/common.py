"""Shared DTO primitives: UUID ids, cursor pagination, error shape."""
from uuid import UUID

from pydantic import BaseModel, Field


class UUIDMixin(BaseModel):
    id: UUID


class CursorPage(BaseModel):
    items: list
    next_cursor: str | None = None
    total: int | None = None


class CursorParams(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)
    cursor: str | None = None
