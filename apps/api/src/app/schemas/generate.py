from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

DocType = Literal[
    "rdd", "prd", "brd", "technical_design", "system_design", "architecture",
    "development_plan", "runbook", "sop", "incident_report", "postmortem", "pm_roadmap",
]
Tone = Literal["formal", "startup", "enterprise"]
Depth = Literal["brief", "detailed", "comprehensive"]

MVP_TYPES: set[str] = {"rdd", "prd", "technical_design"}


class GenerateIn(BaseModel):
    project_id: UUID | None = None
    title: str = Field(min_length=1, max_length=255)
    idea: str = Field(min_length=4, max_length=2000)
    doc_type: DocType = "rdd"
    tone: Tone = "formal"
    depth: Depth = "detailed"
    audience: str | None = Field(default=None, max_length=255)
    generation_model: str | None = None
    humanize_model: str | None = None


class SectionOut(BaseModel):
    id: UUID
    title: str
    order_idx: int
    content_md: str
    word_count: int
    human_score: float | None


class GenerateOut(BaseModel):
    document_id: UUID
    sections: list[SectionOut]
    pages_est: int


class RegenerateSectionIn(BaseModel):
    document_id: UUID
    section_title: str = Field(min_length=1, max_length=255)
    instruction: str | None = Field(default=None, max_length=1000)
    generation_model: str | None = None
