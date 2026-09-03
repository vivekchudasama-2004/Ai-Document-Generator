from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.client import Base
from app.entities.user import UUID36, new_uuid


class Export(Base):
    __tablename__ = "exports"

    id: Mapped[str] = mapped_column(UUID36, primary_key=True, default=new_uuid)
    document_id: Mapped[str] = mapped_column(UUID36, ForeignKey("documents.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(UUID36, ForeignKey("users.id", ondelete="CASCADE"))
    format: Mapped[str] = mapped_column(String(8), nullable=False)
    path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    cloudinary_public_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    secure_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    pages: Mapped[int | None] = mapped_column(Integer, nullable=True)
    words_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
