"""Bring-your-own-keys: OpenRouter / Groq / custom OpenAI-compatible endpoints.

Security contract:
- Only Fernet ciphertext is stored (`user_llm_keys.encrypted_key`). Plaintext
  lives only in the request body and process memory, never in logs, errors,
  or responses (list views are masked to first-3 + last-4).
- Encryption key: `LLM_KEYS_SECRET` when set, else SHA-256 derived from
  `JWT_SECRET`. Set LLM_KEYS_SECRET in prod — rotating JWT_SECRET would
  otherwise orphan every stored key.
- Custom endpoints are SSRF-guarded: https only, no literal IPs, no
  localhost / .local / .internal / .localhost hostnames.
"""
import base64
import hashlib
import ipaddress
from urllib.parse import urlparse

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings
from app.repositories import llm_key_repo

PROVIDER_URLS = {
    "openrouter": "https://openrouter.ai/api/v1",
    "groq": "https://api.groq.com/openai/v1",
}
KNOWN_PROVIDERS = tuple([*PROVIDER_URLS, "custom"])

LOCAL_SUFFIXES = (".local", ".localhost", ".internal", ".lan")
LOCAL_NAMES = {"localhost"}


class KeyError(Exception):
    pass


def _fernet() -> Fernet:
    settings = get_settings()
    secret = settings.LLM_KEYS_SECRET or f"{settings.JWT_SECRET}::llm-keys-v1"
    digest = hashlib.sha256(secret.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str) -> str:
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise KeyError("stored key cannot be decrypted (secret rotated?)") from exc


def mask(plaintext: str) -> str:
    if len(plaintext) <= 7:
        return "•••••••"
    return f"{plaintext[:3]}••••{plaintext[-4:]}"


def validate_custom_url(base_url: str) -> str:
    """Normalize + SSRF-guard a custom OpenAI-compatible base URL."""
    url = (base_url or "").strip().rstrip("/")
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        raise KeyError("custom endpoint must be an https URL")
    host = parsed.hostname.lower()
    if host in LOCAL_NAMES or host.endswith(LOCAL_SUFFIXES):
        raise KeyError("custom endpoint must be a public host")
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        ip = None
    if ip is not None or host in LOCAL_NAMES:
        raise KeyError("custom endpoint must be a public host")
    if parsed.port and not (1 <= parsed.port <= 65535):
        raise KeyError("custom endpoint has a bad port")
    if parsed.username or parsed.password:
        raise KeyError("credentials belong in the api key field, not the URL")
    return url


def split_model(model_id: str) -> tuple[str, str]:
    """'groq/llama-3.1-8b' -> ('groq', 'llama-3.1-8b'). 'custom/lbl/model' keeps rest."""
    prefix, sep, rest = model_id.partition("/")
    if not sep or not rest:
        return "", model_id
    if prefix == "custom":
        label, sep2, name = rest.partition("/")
        if not sep2 or not name:
            return "", model_id
        return "custom", f"{label}/{name}"
    return prefix, rest


def add_key(db, *, user_id: str, provider: str, label: str,
            api_key: str, base_url: str | None = None):
    provider = (provider or "").strip().lower()
    label = (label or "").strip()[:100]
    api_key = (api_key or "").strip()
    if provider not in KNOWN_PROVIDERS:
        raise KeyError(f"provider must be one of {', '.join(KNOWN_PROVIDERS)}")
    if not (8 <= len(api_key) <= 512):
        raise KeyError("api key looks invalid")
    url = None
    if provider == "custom":
        if not base_url:
            raise KeyError("custom provider needs its base URL")
        url = validate_custom_url(base_url)
    elif base_url:
        raise KeyError(f"{provider} has a fixed endpoint — no base URL needed")
    return llm_key_repo.upsert(
        db, user_id=user_id, provider=provider, label=label,
        encrypted_key=encrypt(api_key), base_url=url,
    )


def list_masked(db, *, user_id: str) -> list[dict]:
    out = []
    for row in llm_key_repo.by_user(db, user_id):
        try:
            masked = mask(decrypt(row.encrypted_key))
        except KeyError:
            masked = "unreadable (secret rotated?)"
        out.append({
            "id": row.id, "provider": row.provider, "label": row.label,
            "masked_key": masked, "base_url": row.base_url,
            "created_at": row.created_at,
        })
    return out


def delete_key(db, *, user_id: str, key_id: str) -> bool:
    return llm_key_repo.delete(db, user_id=user_id, key_id=key_id)


def transport_for(db, *, user_id: str, model_id: str) -> dict | None:
    """{base_url, api_key} for provider-prefixed models the user holds a key for.

    Returns None for NIM models (server key path). Raises KeyError never —
    unknown/absent keys simply mean "not a BYOK call".
    """
    provider, rest = split_model(model_id)
    if provider in PROVIDER_URLS:
        row = llm_key_repo.get(db, user_id=user_id, provider=provider, label="")
        label = ""
    elif provider == "custom":
        label, sep, _name = rest.partition("/")
        if not sep:
            return None
        row = llm_key_repo.get(db, user_id=user_id, provider="custom", label=label)
    else:
        return None
    if not row:
        return None
    try:
        api_key = decrypt(row.encrypted_key)
    except KeyError:
        return None
    return {"base_url": row.base_url or PROVIDER_URLS[provider],
            "api_key": api_key, "model": provider_model_name(model_id)}


def provider_model_name(model_id: str) -> str:
    """Downstream model name: strip our routing prefix.

    'groq/llama-3.1-8b' -> 'llama-3.1-8b';
    'custom/my-label/some-model' -> 'some-model'.
    """
    provider, rest = split_model(model_id)
    if provider == "custom":
        _label, sep, name = rest.partition("/")
        return name if sep else rest
    return rest if provider else model_id


def key_available(db, *, user_id: str, model_id: str) -> bool:
    """Does the user hold the key that routes this provider-prefixed id?"""
    provider, rest = split_model(model_id)
    if provider in PROVIDER_URLS:
        return llm_key_repo.get(db, user_id=user_id, provider=provider, label="") is not None
    if provider == "custom":
        label, sep, _name = rest.partition("/")
        if not sep:
            return False
        return llm_key_repo.get(db, user_id=user_id, provider="custom", label=label) is not None
    return False
