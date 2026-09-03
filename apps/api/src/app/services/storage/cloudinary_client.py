"""Cloudinary free-tier upload via signed REST (no SDK needed).
Returns None when CLOUDINARY_URL is missing or upload fails —
callers fall back to local storage + /download redirect."""
import hashlib
import logging
import time
from urllib.parse import urlparse

log = logging.getLogger("storage")


def parse_cloudinary_url(url: str) -> tuple[str, str, str]:
    """cloudinary://API_KEY:API_SECRET@CLOUD_NAME -> (key, secret, cloud)."""
    parsed = urlparse(url)
    if parsed.scheme != "cloudinary" or not parsed.hostname:
        raise ValueError("Bad CLOUDINARY_URL (want cloudinary://key:secret@cloud)")
    return parsed.username or "", parsed.password or "", parsed.hostname


def _signature(params: dict, api_secret: str) -> str:
    payload = "&".join(f"{key}={params[key]}" for key in sorted(params)) + api_secret
    return hashlib.sha1(payload.encode()).hexdigest()


def upload_bytes(data: bytes, *, public_id: str, resource_type: str = "raw") -> dict | None:
    from app.core.config import get_settings

    url = get_settings().CLOUDINARY_URL
    if not url:
        return None
    try:
        import requests

        api_key, api_secret, cloud = parse_cloudinary_url(url)
        timestamp = int(time.time())
        params = {"public_id": public_id, "timestamp": timestamp}
        response = requests.post(
            f"https://api.cloudinary.com/v1_1/{cloud}/{resource_type}/upload",
            data={
                "api_key": api_key,
                "timestamp": timestamp,
                "public_id": public_id,
                "signature": _signature(params, api_secret),
            },
            files={"file": (public_id, data)},
            timeout=30,
        )
        response.raise_for_status()
        body = response.json()
        return {"secure_url": body.get("secure_url"), "public_id": body.get("public_id")}
    except Exception as exc:  # noqa: BLE001 — storage must never break export
        log.warning("cloudinary upload failed: %s", exc)
        return None
