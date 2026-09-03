import os
import sys
from pathlib import Path

os.environ["NIM_MOCK"] = "true"
os.environ["TIDB_URL"] = ""
os.environ["JWT_SECRET"] = "test-secret-for-pytest-only"

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.client import Base, get_db

# import entity modules so tables register
import app.entities.user  # noqa: F401
import app.entities.project  # noqa: F401
import app.entities.document  # noqa: F401
import app.entities.section  # noqa: F401
import app.entities.export  # noqa: F401

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)


def _override():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client():
    from app.main import app

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _reset_rate_limits(client):
    """Prod rate limits stay on; counters reset per test so the suite
    never trips 5/min auth guards from a single test IP."""
    from app.main import app

    try:
        app.state.limiter._storage.reset()
    except Exception:
        pass


@pytest.fixture()
def auth_headers(client):
    import uuid as _uuid

    resp = client.post(
        "/api/auth/signup",
        json={"email": f"qa-{_uuid.uuid4().hex[:8]}@example.com",
              "password": "password123", "display_name": "QA"},
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
