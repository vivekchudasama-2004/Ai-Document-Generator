"""Cursor pagination over (created_at, id) — Appendix D.

Offsets leak collection size and drift under inserts; cursors don't.
Cursor format: urlsafe-base64 of "<created_at ISO>;<id>".
"""
import base64
from datetime import datetime
from typing import Any

from sqlalchemy import tuple_


def encode_cursor(created_at: datetime, id: str) -> str:
    raw = f"{created_at.isoformat()};{id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def decode_cursor(cursor: str) -> tuple[datetime, str] | None:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode()).decode()
        ts, sep, sid = raw.partition(";")
        if not sep or not sid:
            return None
        return datetime.fromisoformat(ts), sid
    except Exception:
        return None


def apply_cursor(query: Any, entity: Any, cursor: str | None, limit: int) -> tuple[list, str | None]:
    """Newest-first page. Returns (items, next_cursor or None when exhausted)."""
    query = query.order_by(entity.created_at.desc(), entity.id.desc())
    if cursor:
        decoded = decode_cursor(cursor)
        if decoded:
            ts, sid = decoded
            query = query.filter(tuple_(entity.created_at, entity.id) < (ts, sid))
    rows = query.limit(limit + 1).all()
    next_cursor = encode_cursor(rows[-1].created_at, rows[-1].id) if len(rows) > limit else None
    return rows[:limit], next_cursor
