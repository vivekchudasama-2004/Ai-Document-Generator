from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core import error_codes as CODES
from app.core.errors import fail
from app.core.security import get_current_user
from app.db.client import get_db
from app.services import rag

router = APIRouter(tags=["rag"])


@router.get("/rag/status")
def status(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Index health: corpus model, embedded share, which models are stored."""
    return rag.status_info(db, user_id=str(user.id))


@router.post("/rag/similar")
def similar(body: dict, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Top-k semantically similar sections across the user's documents.

    `embedding_model` switches lite ↔ large per request (validated); vectors
    from different models are incomparable, so after changing the corpus
    model run `backfill_embeddings.py --all` before trusting scores.
    """
    try:
        model = rag.resolve_embedding_model(body.get("embedding_model"))
    except ValueError as exc:
        fail(422, CODES.MODEL_NOT_ALLOWED, model=str(exc))
    if not rag.is_configured():
        fail(503, CODES.RAG_NOT_CONFIGURED)
    text = (body.get("text") or "").strip()
    if not text:
        fail(422, CODES.RAG_EMPTY_QUERY)
    try:
        top_k = max(1, min(int(body.get("top_k", 5)), 20))
    except (TypeError, ValueError):
        fail(422, CODES.RAG_BAD_TOP_K)
    try:
        (query_vec,) = rag.embed_texts([text], input_type="query", model=model)
    except Exception:
        fail(502, CODES.RAG_EMBED_FAILED)
    return {
        "model": model,
        "items": rag.find_similar(
            db, user_id=str(user.id), query_vec=query_vec, top_k=top_k,
            project_id=body.get("project_id"),
        ),
    }
