import json

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.client import get_db
from app.entities.document import Version
from app.repositories import document_repo, section_repo
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
        raise HTTPException(status_code=404, detail="Not found")
    score = score_text(body.content_md)
    row = section_repo.update_content(db, row, body.content_md, count_words(body.content_md))
    row.human_score = score["human_percent"]
    row.ai_score = score["ai_prob"]
    db.commit()
    return {"id": row.id, "word_count": row.word_count, "human_score": row.human_score}


@router.get("/humanize/history/{section_id}")
def history(section_id: UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = section_repo.get_owned(db, user_id=str(user.id), section_id=str(section_id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
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
