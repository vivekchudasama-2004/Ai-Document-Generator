"""Add sections.embedding_json (stored normalized embedding vector, TEXT).

Revision ID: 0002_section_embeddings
Revises: 0001_initial
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_section_embeddings"
down_revision: str | Sequence[str] | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("sections", sa.Column("embedding_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("sections", "embedding_json")
