"""Model management: live NVIDIA availability, per-user enabled set,
auto-mode preview. The picker never trusts a hardcoded list alone."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core import error_codes as CODES
from app.core.errors import fail
from app.core.security import get_current_user
from app.db.client import get_db
from app.repositories import user_model_repo
from app.services.llm.models import auto_select_model, live_model_ids

router = APIRouter(tags=["models"])


def _describe(model_id: str) -> dict:
    """Catalog metadata for known ids; sensible fallback for the rest."""
    known = {
        "meta/llama-3.1-405b-instruct": ("Llama 3.1 405B", "generate", "high"),
        "meta/llama-3.1-70b-instruct": ("Llama 3.1 70B", "both", "medium"),
        "meta/llama-3.1-8b-instruct": ("Llama 3.1 8B", "humanize", "low"),
        "nvidia/llama-3.1-nemotron-nano-8b-v1": ("Nemotron Nano 8B", "humanize", "low"),
    }
    if model_id in known:
        label, role, cost = known[model_id]
    else:
        label = model_id.split("/")[-1].replace("-", " ").title()
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
    live_ids = live_model_ids()
    if live_ids is not None and model_id not in live_ids:
        fail(422, CODES.MODEL_NOT_ALLOWED, model=model_id)
    row = user_model_repo.set_enabled(
        db, user_id=str(current_user.id), model_id=model_id,
        enabled=bool(body.get("enabled", True)),
    )
    return {"model_id": model_id, "enabled": row is not None}


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
