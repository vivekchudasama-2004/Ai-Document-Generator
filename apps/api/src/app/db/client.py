"""TiDB (MySQL protocol) singleton. Engine is lazy — app boots without
TIDB_URL (health reports db:false) and data endpoints answer 503."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core import error_codes as CODES
from app.core.errors import fail

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def normalize_url(url: str) -> str:
    if url.startswith("mysql://"):
        # TiDB dashboard hands out mysql:// — force the pure-python driver.
        return "mysql+pymysql://" + url[len("mysql://"):]
    return url


def connect_args_for(url: str) -> dict:
    """TiDB Serverless refuses insecure transport — force TLS via certifi
    when the URL itself carries no ssl params."""
    if "tidbcloud.com" in url and "ssl" not in url:
        try:
            import certifi

            return {"ssl": {"ca": certifi.where()}}
        except Exception:
            return {}
    return {}


def _build():
    url = get_settings().TIDB_URL
    if not url:
        return None, None
    url = normalize_url(url)
    engine = create_engine(
        url, connect_args=connect_args_for(url),
        pool_pre_ping=True, pool_recycle=300,
    )
    return engine, sessionmaker(bind=engine, autoflush=False, autocommit=False)


engine, SessionLocal = _build()


def get_db() -> Generator:
    if SessionLocal is None:
        fail(503, CODES.DB_NOT_CONFIGURED)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
