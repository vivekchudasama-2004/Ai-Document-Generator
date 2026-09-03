from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.client import Base
from app.entities.user import UUID36, new_uuid


class AdminAudit(Base):
    """Who changed whose role, when. Written on every role set."""

    __tablename__ = "admin_audits"

    id: Mapped[str] = mapped_column(UUID36, primary_key=True, default=new_uuid)
    actor_id: Mapped[str] = mapped_column(UUID36, ForeignKey("users.id", ondelete="CASCADE"))
    target_id: Mapped[str] = mapped_column(UUID36, nullable=False)
    action: Mapped[str] = mapped_column(String(32), nullable=False, default="role.set")
    old_role: Mapped[str] = mapped_column(String(16), nullable=False)
    new_role: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
