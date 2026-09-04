"""NIM model catalog + validation. Defaults: nemotron-70b generate / mistral-7b humanize.
User overrides are validated against ALLOWED_MODELS (ARCHITECTURE.md v1.2)."""
from app.core.config import get_settings

CATALOG: list[dict] = [
    {
        "id": "mistralai/mistral-large-2-instruct",
        "label": "Mistral Large 2",
        "role": "generate",
        "context": 128000,
        "cost": "high",
        "max_tokens": 4000,
    },
    {
        "id": "nvidia/llama-3.1-nemotron-70b-instruct",
        "label": "Nemotron 70B",
        "role": "both",
        "context": 128000,
        "cost": "medium",
        "max_tokens": 4000,
    },
    {
        "id": "mistralai/mistral-7b-instruct-v0.3",
        "label": "Mistral 7B",
        "role": "humanize",
        "context": 32000,
        "cost": "low",
        "max_tokens": 2000,
    },
]

GENERATE_FALLBACK_CHAIN = [
    "mistralai/mistral-large-2-instruct",
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "mistralai/mistral-7b-instruct-v0.3",
]


class ModelNotAllowed(ValueError):
    """Raised by resolve_model; carries the rejected id for messages."""

    def __init__(self, model: str):
        super().__init__(f"Model not allowed: {model}")
        self.model = model


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


def resolve_model(
    role: str, override: str | None = None, *, extra_allowed: tuple = (),
    idea: str = "", doc_type: str = "rdd", depth: str = "brief", text: str = "",
) -> str:
    """Return a validated model id for role (generate|humanize).

    `override="auto"` (the default) picks the cheapest capable model from
    the prompt complexity. `extra_allowed` carries the user's enabled models.
    """
    settings = get_settings()
    allowed = set(settings.allowed_models) | set(extra_allowed)
    default = (
        settings.DEFAULT_GENERATION_MODEL if role == "generate"
        else settings.DEFAULT_HUMANIZE_MODEL
    )
    pick = override or default
    if pick == AUTO:
        model, _reasons = auto_select_model(
            role=role, idea=idea, doc_type=doc_type, depth=depth, text=text
        )
        if model in allowed:
            return model
        if default in allowed:
            return default
        if allowed:
            return sorted(allowed)[0]
        raise ModelNotAllowed(pick)
    if pick not in allowed:
        raise ModelNotAllowed(pick)
    return pick


def budget_for(model_id: str) -> int:
    for m in CATALOG:
        if m["id"] == model_id:
            return m["max_tokens"]
    return 2000


# Small models follow instructions better with tighter style rails.
HUMANIZE_SUFFIX: dict[str, str] = {
    "mistralai/mistral-7b-instruct-v0.3": " Keep every sentence under 20 words.",
}


def humanize_suffix(model_id: str) -> str:
    return HUMANIZE_SUFFIX.get(model_id, "")


AUTO = "auto"
NIM_BASE_URL = "https://integrate.api.nvidia.com/v1"

# Doc types whose reasoning load justifies the flagship writer.
COMPLEX_TYPES = {"system_design", "architecture", "technical_design"}

_live_cache: dict = {"at": 0.0, "ids": None}
LIVE_TTL_SECONDS = 600


def auto_select_model(
    *, role: str, idea: str = "", doc_type: str = "rdd",
    depth: str = "brief", text: str = "",
) -> tuple[str, list[str]]:
    """Token-optimized pick: the smallest model that fits the complexity,
    with reasons so the choice is inspectable (see auto-preview endpoint)."""
    if role == "humanize":
        if len(text) > 4000:
            return ("nvidia/llama-3.1-nemotron-70b-instruct",
                    [f"long section (~{len(text)} chars) needs the bigger humanizer"])
        return ("mistralai/mistral-7b-instruct-v0.3",
                ["short section: cheapest capable humanizer"])
    score = 0
    reasons: list[str] = []
    if depth == "detailed":
        score += 2
        reasons.append("detailed depth")
    if doc_type in COMPLEX_TYPES:
        score += 2
        reasons.append(f"{doc_type} needs architecture reasoning")
    words = len(idea.split())
    if words > 60:
        score += 2
        reasons.append("long brief")
    elif words > 25:
        score += 1
        reasons.append("medium brief")
    lowered = idea.lower()
    if "mermaid" in lowered or "diagram" in lowered:
        score += 1
        reasons.append("diagrams requested")
    if score >= 5:
        return ("mistralai/mistral-large-2-instruct", reasons + ["high complexity: flagship writer"])
    if score >= 3:
        return ("nvidia/llama-3.1-nemotron-70b-instruct", reasons + ["medium complexity: balanced writer"])
    return ("mistralai/mistral-7b-instruct-v0.3", reasons + ["simple brief: cheapest capable writer"])


def live_model_ids() -> list[str] | None:
    """Model ids your NVIDIA key can call right now. None means unknown
    (mock mode, no key, or NVIDIA unreachable) — callers must not block on it."""
    settings = get_settings()
    if settings.NIM_MOCK or not settings.NVIDIA_NIM_API_KEY:
        return None
    import time

    now = time.time()
    if _live_cache["ids"] is not None and now - _live_cache["at"] < LIVE_TTL_SECONDS:
        return _live_cache["ids"]
    try:
        import httpx

        response = httpx.get(
            f"{NIM_BASE_URL}/models",
            headers={"Authorization": f"Bearer {settings.NVIDIA_NIM_API_KEY}"},
            timeout=10,
        )
        response.raise_for_status()
        ids = [m["id"] for m in response.json().get("data", []) if m.get("id")]
        _live_cache.update(at=now, ids=ids)
        return ids
    except Exception:
        return _live_cache["ids"]  # stale list beats no list
