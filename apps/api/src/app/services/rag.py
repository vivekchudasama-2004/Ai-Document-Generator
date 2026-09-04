"""Retrieval over stored section embeddings — embeddings API + TiDB, no local ML.

Why this shape: serverless functions can't host torch/transformers (250MB
limit, no persistent disk, no GPU), so embeddings come from an
OpenAI-compatible API and vectors are stored as JSON on the section row.
At current scale (hundreds of sections) Python cosine over normalized
vectors is exact and fast. Upgrade path when it stops being enough:
native TiDB VECTOR column + vector index (see ARCHITECTURE.md).
"""
import json
import math

import httpx

from app.core.config import get_settings


def is_configured() -> bool:
    s = get_settings()
    return bool(s.EMBEDDING_API_URL and s.EMBEDDING_API_KEY and s.EMBEDDING_MODEL)


# Voyage retrieval family: the corpus model plus its siblings. Vectors from
# different models live in different spaces and must never be ranked together —
# switching the corpus model requires `backfill_embeddings.py --all`.
VOYAGE_MODELS = ("voyage-3-lite", "voyage-3", "voyage-3-large")


def resolve_embedding_model(override: str | None) -> str:
    """Corpus model by default; validated override on request (safe switching)."""
    settings = get_settings()
    if not override or override == "auto":
        return settings.EMBEDDING_MODEL
    allowed = {settings.EMBEDDING_MODEL, *VOYAGE_MODELS}
    if override not in allowed:
        raise ValueError(override)
    return override


def embed_texts(texts: list[str], input_type: str = "document", model: str | None = None) -> list[list[float]]:
    """Embed via any OpenAI-compatible /v1/embeddings endpoint (Voyage, Cohere, …).

    Voyage quality depends on input_type: "document" for stored sections,
    "query" for the user's search text (asymmetric retrieval).
    """
    s = get_settings()
    url = s.EMBEDDING_API_URL.rstrip("/") + "/embeddings"
    resp = httpx.post(
        url,
        headers={"Authorization": f"Bearer {s.EMBEDDING_API_KEY}"},
        json={"model": model or s.EMBEDDING_MODEL, "input": texts, "input_type": input_type},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()["data"]
    return [item["embedding"] for item in sorted(data, key=lambda d: d["index"])]


def _norm(vec: list[float]) -> list[float]:
    length = math.sqrt(sum(x * x for x in vec)) or 1.0
    return [x / length for x in vec]


def _cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return -1.0
    return sum(x * y for x, y in zip(a, b))


def rank(query_vec: list[float], candidates: list[tuple[str, list[float]]], top_k: int) -> list[tuple[str, float]]:
    """Cosine-rank candidate (id, vector) pairs. Malformed vectors score last."""
    q = _norm([float(x) for x in query_vec])
    scored = []
    for cid, vec in candidates:
        try:
            scored.append((cid, _cosine(q, _norm([float(x) for x in vec]))))
        except (ValueError, TypeError):
            scored.append((cid, -1.0))
    scored.sort(key=lambda t: t[1], reverse=True)
    return scored[:max(1, top_k)]


def encode_embedding(vec: list[float]) -> str:
    return json.dumps(_norm([float(x) for x in vec]))


def refresh_section_embedding(section) -> bool:
    """Best-effort: (re-)embed a section's current content and store the vector.

    Called on every section write (edit, humanize) so search never goes stale.
    Never raises — retrieval is auxiliary, writes must not fail because of it.
    """
    if not is_configured():
        return False
    try:
        content = (section.content_humanized_md or section.content_md)[:4000]
        if not content.strip():
            return False
        model = get_settings().EMBEDDING_MODEL
        (vec,) = embed_texts([content], input_type="document", model=model)
        section.embedding_json = encode_embedding(vec)
        section.embedding_model = model
        return True
    except Exception:
        return False


def decode_embedding(raw: str | None) -> list[float] | None:
    if not raw:
        return None
    try:
        vec = json.loads(raw)
        if isinstance(vec, list) and vec and all(isinstance(x, (int, float)) for x in vec):
            return [float(x) for x in vec]
    except (ValueError, TypeError):
        pass
    return None


def find_similar(db, *, user_id: str, query_vec: list[float], top_k: int = 5,
                 project_id: str | None = None) -> list[dict]:
    """Top-k sections by cosine, scoped to the user's documents. Rows without
    a stored embedding are skipped (run scripts/backfill_embeddings.py)."""
    from app.entities.document import Document
    from app.entities.section import Section

    query = (
        db.query(Section, Document)
        .join(Document, Section.document_id == Document.id)
        .filter(Document.user_id == user_id, Section.embedding_json.isnot(None))
    )
    if project_id:
        query = query.filter(Document.project_id == project_id)
    candidates: list[tuple[str, list[float]]] = []
    meta: dict[str, dict] = {}
    for section, doc in query.all():
        vec = decode_embedding(section.embedding_json)
        if vec is None:
            continue
        candidates.append((section.id, vec))
        meta[section.id] = {
            "section_id": section.id, "document_id": doc.id,
            "document_title": doc.title, "section_title": section.title,
        }
    out = []
    for sid, score in rank(query_vec, candidates, top_k):
        out.append({**meta[sid], "score": round(score, 4)})
    return out


def status_info(db, *, user_id: str) -> dict:
    """Index health for switching models safely: what share is embedded,
    and which models produced the stored vectors."""
    from app.entities.document import Document
    from app.entities.section import Section

    total = (
        db.query(Section)
        .join(Document, Section.document_id == Document.id)
        .filter(Document.user_id == user_id)
        .count()
    )
    rows = (
        db.query(Section.embedding_model)
        .join(Document, Section.document_id == Document.id)
        .filter(Document.user_id == user_id, Section.embedding_json.isnot(None))
        .all()
    )
    models = sorted({r[0] or "unknown" for r in rows})
    return {
        "configured": is_configured(),
        "model": get_settings().EMBEDDING_MODEL or None,
        "sections_total": total,
        "sections_embedded": len(rows),
        "models_present": models,
    }
