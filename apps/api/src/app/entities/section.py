from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.client import Base
from app.entities.user import UUID36, new_uuid


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[str] = mapped_column(UUID36, primary_key=True, default=new_uuid)
    document_id: Mapped[str] = mapped_column(UUID36, ForeignKey("documents.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order_idx: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    content_md: Mapped[str] = mapped_column(Text, nullable=False, default="")
    content_humanized_md: Mapped[str | None] = mapped_column(Text, nullable=True)
    word_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ai_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    human_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    iteration: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    mermaid_svg: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Retrieval: normalized embedding vector as JSON (see services/rag.py).
    # Upgrade path is a native TiDB VECTOR column + vector index (ARCHITECTURE.md).
    embedding_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Which model produced embedding_json — vectors from different models are
    # incomparable, so switching models requires backfill --all (see RAG status).
    embedding_model: Mapped[str | None] = mapped_column(String(128), nullable=True)
