"""Cloudinary free-tier upload. Returns None when CLOUDINARY_URL is missing —
callers fall back to local storage + /download redirect."""
import logging

log = logging.getLogger("storage")


def upload_bytes(data: bytes, *, public_id: str, resource_type: str = "raw") -> dict | None:
    from app.core.config import get_settings

    if not get_settings().CLOUDINARY_URL:
        return None
    log.info("cloudinary upload stub public_id=%s", public_id)
    return None
