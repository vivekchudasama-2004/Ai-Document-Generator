from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

Strength = Literal["light", "medium", "aggressive"]


class HumanizeIn(BaseModel):
    section_id: UUID
    strength: Strength = "medium"
    humanize_model: str | None = None
    max_iterations: int = Field(default=3, ge=1, le=3)


class HumanizeBatchIn(BaseModel):
    document_id: UUID
    strength: Strength = "medium"
    humanize_model: str | None = None


class DetectIn(BaseModel):
    text: str = Field(min_length=1, max_length=20000)


class DetectBatchItem(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    text: str = Field(min_length=1, max_length=20000)


class DetectBatchIn(BaseModel):
    texts: list[DetectBatchItem] = Field(min_length=1, max_length=50)


class SectionEditIn(BaseModel):
    content_md: str = Field(min_length=1, max_length=50000)


class MermaidIn(BaseModel):
    code: str = Field(min_length=1, max_length=10000)
