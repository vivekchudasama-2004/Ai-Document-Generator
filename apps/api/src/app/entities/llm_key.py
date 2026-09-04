from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.client import Base
from app.entities.user import UUID36, new_uuid


class LLMKey(Base):
    """A user's own provider key (OpenRouter, Groq, custom endpoint).

    Only ciphertext is stored — plaintext never touches the DB or logs.
    """

    __tablename__ = "user_llm_keys"
    __table_args__ = (
        UniqueConstraint("user_id", "provider", "label", name="uq_user_llm_key"),
    )

    id: Mapped[str] = mapped_column(UUID36, primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(UUID36, ForeignKey("users.id", ondelete="CASCADE"))
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    encrypted_key: Mapped[str] = mapped_column(Text, nullable=False)
    base_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
