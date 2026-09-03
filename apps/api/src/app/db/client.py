"""TiDB (MySQL protocol) singleton. Engine is lazy — app boots without
TIDB_URL (health reports db:false) and data endpoints answer 503."""
from collections.abc import Generator

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


def _build():
    url = get_settings().TIDB_URL
    if not url:
        return None, None
    engine = create_engine(url, pool_pre_ping=True, pool_recycle=300)
    return engine, sessionmaker(bind=engine, autoflush=False, autocommit=False)


engine, SessionLocal = _build()


def get_db() -> Generator:
    if SessionLocal is None:
        raise HTTPException(status_code=503, detail="DB not configured (set TIDB_URL)")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
