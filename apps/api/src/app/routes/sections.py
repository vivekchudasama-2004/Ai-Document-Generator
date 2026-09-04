import json

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core import error_codes as CODES
from app.core.errors import fail

from app.core.security import get_current_user
from app.db.client import get_db
from app.entities.document import Version
from app.repositories import section_repo
from app.schemas.humanize import SectionEditIn
from app.services.detector import count_words, score_text

router = APIRouter(tags=["sections"])


@router.put("/sections/{section_id}")
def edit_section(
    section_id: UUID, body: SectionEditIn,
    user=Depends(get_current_user), db: Session = Depends(get_db),
):
    row = section_repo.get_owned(db, user_id=str(user.id), section_id=str(section_id))
    if not row:
        fail(404, CODES.SECTION_NOT_FOUND)
    score = score_text(body.content_md)
    row = section_repo.update_content(db, row, body.content_md, count_words(body.content_md))
    row.human_score = score["human_percent"]
    row.ai_score = score["ai_prob"]
    from app.services import rag as _rag
    _rag.refresh_section_embedding(row)  # best-effort: search stays fresh
    db.commit()
    return {"id": row.id, "word_count": row.word_count, "human_score": row.human_score}


@router.post("/sections/{section_id}/move")
def move_section(
    section_id: UUID, body: dict,
    user=Depends(get_current_user), db: Session = Depends(get_db),
):
    """Reorder the studio outline: swap this section with its neighbour."""
    direction = str(body.get("direction") or "").strip().lower()
    if direction not in ("up", "down"):
        fail(422, CODES.SECTION_BAD_MOVE)
    row = section_repo.get_owned(db, user_id=str(user.id), section_id=str(section_id))
    if not row:
        fail(404, CODES.SECTION_NOT_FOUND)
    siblings = section_repo.ordered_siblings(db, str(row.document_id))
    idx = next((i for i, s in enumerate(siblings) if str(s.id) == str(row.id)), None)
    neighbour = siblings[idx - 1] if direction == "up" and idx and idx > 0 else None
    if neighbour is None and direction == "down" and idx is not None and idx < len(siblings) - 1:
        neighbour = siblings[idx + 1]
    if neighbour is None:
        return {"id": row.id, "order_idx": row.order_idx, "moved": False}
    section_repo.swap_order(db, row, neighbour)
    return {"id": row.id, "order_idx": row.order_idx, "moved": True}


@router.get("/humanize/history/{section_id}")
def history(section_id: UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = section_repo.get_owned(db, user_id=str(user.id), section_id=str(section_id))
    if not row:
        fail(404, CODES.SECTION_NOT_FOUND)
    versions = (
        db.query(Version)
        .filter(Version.document_id == row.document_id)
        .order_by(Version.version_no)
        .all()
    )
    trail = []
    for v in versions:
        try:
            snap = json.loads(v.snapshot_json)
        except ValueError:
            continue
        for item in snap:
            if item.get("title") == row.title:
                trail.append({"version_no": v.version_no,
                              "human_percent": score_text(item["content_md"])["human_percent"]})
    trail.append({"iteration": row.iteration, "human_percent": row.human_score})
    return {"sectionId": row.id, "history": trail}
