"""Track which model produced each section vector (vectors across models are incomparable).

Revision ID: 0003_embedding_model
Revises: 0002_section_embeddings
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_embedding_model"
down_revision: str | Sequence[str] | None = "0002_section_embeddings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("sections", sa.Column("embedding_model", sa.String(128), nullable=True))


def downgrade() -> None:
    op.drop_column("sections", "embedding_model")
