"""NIM model catalog + validation. Defaults: 405b generate / 8b humanize.
User overrides are validated against ALLOWED_MODELS (ARCHITECTURE.md v1.2)."""
from app.core.config import get_settings

CATALOG: list[dict] = [
    {
        "id": "meta/llama-3.1-405b-instruct",
        "label": "Llama 3.1 405B",
        "role": "generate",
        "context": 128000,
        "cost": "high",
        "max_tokens": 4000,
    },
    {
        "id": "meta/llama-3.1-70b-instruct",
        "label": "Llama 3.1 70B",
        "role": "both",
        "context": 128000,
        "cost": "medium",
        "max_tokens": 4000,
    },
    {
        "id": "meta/llama-3.1-8b-instruct",
        "label": "Llama 3.1 8B",
        "role": "humanize",
        "context": 128000,
        "cost": "low",
        "max_tokens": 2000,
    },
    {
        "id": "nvidia/llama-3.1-nemotron-nano-8b-v1",
        "label": "Nemotron Nano 8B",
        "role": "humanize",
        "context": 128000,
        "cost": "low",
        "max_tokens": 2000,
    },
]

GENERATE_FALLBACK_CHAIN = [
    "meta/llama-3.1-405b-instruct",
    "meta/llama-3.1-70b-instruct",
    "meta/llama-3.1-8b-instruct",
]


def list_models() -> list[dict]:
    allowed = set(get_settings().allowed_models)
    return [
        {**m, "available": m["id"] in allowed, "default": m["id"] in _defaults()}
        for m in CATALOG
        if m["id"] in allowed
    ]


def _defaults() -> set[str]:
    s = get_settings()
    return {s.DEFAULT_GENERATION_MODEL, s.DEFAULT_HUMANIZE_MODEL}


def resolve_model(role: str, override: str | None) -> str:
    """Return a validated model id for role (generate|humanize)."""
    s = get_settings()
    if override:
        if override not in s.allowed_models:
            raise ValueError(f"Model not allowed: {override}")
        return override
    return s.DEFAULT_GENERATION_MODEL if role == "generate" else s.DEFAULT_HUMANIZE_MODEL


def budget_for(model_id: str) -> int:
    for m in CATALOG:
        if m["id"] == model_id:
            return m["max_tokens"]
    return 2000
