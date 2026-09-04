"""Alembic env — DocuForge. Reads TIDB_URL from app settings, targets
Base.metadata (all entities imported for autogenerate). Run from apps/api:
`alembic upgrade head` (needs TIDB_URL)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from alembic import context
from sqlalchemy import create_engine

from app.core.config import get_settings
from app.db.client import Base, connect_args_for, normalize_url

import app.entities.user  # noqa: F401
import app.entities.admin_audit  # noqa: F401
import app.entities.user_model  # noqa: F401
import app.entities.project  # noqa: F401
import app.entities.document  # noqa: F401
import app.entities.section  # noqa: F401
import app.entities.export  # noqa: F401

config = context.config
target_metadata = Base.metadata


def get_url() -> str:
    url = get_settings().TIDB_URL
    if not url:
        raise SystemExit("TIDB_URL missing — copy .env.example to .env first")
    return normalize_url(url)


def run_migrations_offline() -> None:
    context.configure(url=get_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = get_url()
    engine = create_engine(url, connect_args=connect_args_for(url), pool_pre_ping=True)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
