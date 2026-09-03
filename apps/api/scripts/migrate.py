"""Create TiDB tables (Alembic arrives post-MVP). Requires TIDB_URL."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from app.core.config import get_settings
from app.db.client import Base

import app.entities.user  # noqa: F401
import app.entities.project  # noqa: F401
import app.entities.document  # noqa: F401
import app.entities.section  # noqa: F401
import app.entities.export  # noqa: F401

if not get_settings().TIDB_URL:
    raise SystemExit("TIDB_URL missing — copy .env.example to .env first")

from sqlalchemy import create_engine  # noqa: E402

engine = create_engine(get_settings().TIDB_URL, pool_pre_ping=True)
Base.metadata.create_all(bind=engine)
print(f"tables ready: {sorted(Base.metadata.tables)}")
