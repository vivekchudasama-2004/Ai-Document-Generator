"""Model management: live NVIDIA availability, per-user enabled set,
auto-mode preview, and BYOK provider keys. The picker never trusts a
hardcoded list alone; plaintext keys never leave the request."""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core import error_codes as CODES
from app.core.errors import fail
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.db.client import get_db
from app.repositories import user_model_repo
from app.services import keys as byok
from app.services.llm.models import auto_select_model, live_model_ids

router = APIRouter(tags=["models"])


def _describe(model_id: str) -> dict:
    """Catalog metadata for known ids; sensible fallback for the rest."""
    known = {
        "mistralai/mistral-large-2-instruct": ("Mistral Large 2", "generate", "high"),
        "nvidia/llama-3.1-nemotron-70b-instruct": ("Nemotron 70B", "both", "medium"),
        "mistralai/mistral-7b-instruct-v0.3": ("Mistral 7B", "humanize", "low"),
    }
    if model_id in known:
        label, role, cost = known[model_id]
    else:
        provider, _rest = byok.split_model(model_id)
        short = model_id.split("/")[-1].replace("-", " ").title()
        if provider in byok.PROVIDER_URLS:
            label = f"{short} ({provider})"
        elif provider == "custom":
            label = f"{short} (custom)"
        else:
            label = short
        role, cost = "both", "medium"
    return {"id": model_id, "label": label, "role": role, "cost": cost}


@router.get("/models/available")
def models_available(current_user=Depends(get_current_user)):
    """Live list from NVIDIA for this server key (cached 10 min server-side)."""
    ids = live_model_ids()
    if ids is None:
        return {"live": False, "models": [],
                "hint": "Set NVIDIA_NIM_API_KEY (and NIM_MOCK=false) to fetch the live list."}
    return {"live": True, "models": [_describe(model_id) for model_id in ids]}


@router.get("/models/enabled")
def models_enabled(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    ids = user_model_repo.enabled_ids(db, str(current_user.id))
    return {"items": [_describe(model_id) for model_id in ids]}


@router.post("/models/enabled")
def models_set_enabled(body: dict, current_user=Depends(get_current_user),
                       db: Session = Depends(get_db)):
    model_id = (body.get("model_id") or "").strip()
    if not model_id or len(model_id) > 128:
        fail(422, CODES.MODEL_NOT_ALLOWED, model=model_id or "empty")
    provider, _rest = byok.split_model(model_id)
    if provider in ("groq", "openrouter", "custom"):
        # These ids only ever work with the user's own key — even when the
        # live list is unknown (mock/offline) — so a saved model never dangles.
        # (`nvidia/…` ids stay enable-able: admins may use the server key, and
        # members are gated at generation time instead.)
        if not byok.key_available(db, user_id=str(current_user.id), model_id=model_id):
            fail(422, CODES.MODEL_NOT_ALLOWED, model=model_id)
        row = user_model_repo.set_enabled(
            db, user_id=str(current_user.id), model_id=model_id,
            enabled=bool(body.get("enabled", True)),
        )
        return {"model_id": model_id, "enabled": row is not None}
    live_ids = live_model_ids()
    if live_ids is not None and model_id not in live_ids:
        fail(422, CODES.MODEL_NOT_ALLOWED, model=model_id)
    row = user_model_repo.set_enabled(
        db, user_id=str(current_user.id), model_id=model_id,
        enabled=bool(body.get("enabled", True)),
    )
    return {"model_id": model_id, "enabled": row is not None}


@router.get("/models/keys")
def models_keys(current_user=Depends(get_current_user),
                db: Session = Depends(get_db)):
    """Saved provider keys — masked, never plaintext."""
    return {"items": byok.list_masked(db, user_id=str(current_user.id))}


@router.post("/models/keys", status_code=201)
@limiter.limit("10/minute")
def models_add_key(body: dict, request: Request,
                   current_user=Depends(get_current_user),
                   db: Session = Depends(get_db)):
    """Save (or rotate) one provider key. Stored Fernet-encrypted; the
    plaintext is never logged, persisted, or returned."""
    try:
        row = byok.add_key(
            db, user_id=str(current_user.id),
            provider=body.get("provider", ""), label=body.get("label", ""),
            api_key=body.get("api_key", ""), base_url=body.get("base_url"),
        )
    except byok.KeyError as exc:
        fail(422, CODES.BYOK_INVALID, detail=str(exc))
    masked = byok.list_masked(db, user_id=str(current_user.id))
    saved = next((k for k in masked if k["id"] == row.id), None)
    return {"saved": saved}


@router.delete("/models/keys/{key_id}")
def models_delete_key(key_id: str, current_user=Depends(get_current_user),
                      db: Session = Depends(get_db)):
    if not byok.delete_key(db, user_id=str(current_user.id), key_id=key_id):
        fail(404, CODES.BYOK_NOT_FOUND)
    return {"deleted": key_id}


@router.get("/models/auto-preview")
def models_auto_preview(
    role: str = Query(default="generate", pattern="^(generate|humanize)$"),
    idea: str = Query(default=""),
    doc_type: str = Query(default="rdd"),
    depth: str = Query(default="brief"),
    text: str = Query(default=""),
    current_user=Depends(get_current_user),
):
    """Show which model Auto would pick for this brief, and why."""
    model, reasons = auto_select_model(
        role=role, idea=idea[:2000], doc_type=doc_type, depth=depth, text=text[:8000]
    )
    return {"model": _describe(model), "reasons": reasons}
