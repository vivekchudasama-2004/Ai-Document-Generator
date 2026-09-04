"""Per-user provider keys (BYOK). Table 10: user_llm_keys.

Revision ID: 0004_llm_keys
Revises: 0003_embedding_model
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_llm_keys"
down_revision: str | Sequence[str] | None = "0003_embedding_model"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_llm_keys",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("label", sa.String(100), nullable=False, server_default=""),
        sa.Column("encrypted_key", sa.Text(), nullable=False),
        sa.Column("base_url", sa.String(512)),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "provider", "label", name="uq_user_llm_key"),
    )


def downgrade() -> None:
    op.drop_table("user_llm_keys")
