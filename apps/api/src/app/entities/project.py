import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.client import Base
from app.entities.user import UUID36, new_uuid


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(UUID36, primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(UUID36, ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    idea: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


# keep uuid import used for re-export clarity
_ = uuid.uuid4
