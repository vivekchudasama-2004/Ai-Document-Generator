from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.client import Base
from app.entities.user import UUID36, new_uuid


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(UUID36, primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(UUID36, ForeignKey("projects.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(UUID36, ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    tone: Mapped[str] = mapped_column(String(16), nullable=False, default="formal")
    depth: Mapped[str] = mapped_column(String(16), nullable=False, default="detailed")
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="draft")
    generation_model: Mapped[str] = mapped_column(
        String(128), nullable=False, default="meta/llama-3.1-405b-instruct"
    )
    humanize_model: Mapped[str] = mapped_column(
        String(128), nullable=False, default="meta/llama-3.1-8b-instruct"
    )
    human_score_avg: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    tokens_used_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Version(Base):
    __tablename__ = "versions"

    id: Mapped[str] = mapped_column(UUID36, primary_key=True, default=new_uuid)
    document_id: Mapped[str] = mapped_column(UUID36, ForeignKey("documents.id", ondelete="CASCADE"))
    version_no: Mapped[int] = mapped_column(nullable=False)
    snapshot_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
