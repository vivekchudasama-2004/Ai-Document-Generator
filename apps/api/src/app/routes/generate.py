import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.client import get_db
from app.repositories import document_repo
from app.schemas.generate import GenerateIn, GenerateOut, RegenerateSectionIn, SectionOut
from app.services import generator
from app.services.detector import score_text
from app.services.llm.models import resolve_model

router = APIRouter(tags=["generate"])


def _persist(db: Session, *, user_id: str, body: GenerateIn, sections: list[dict],
             model_used: str) -> tuple:
    project_id = str(body.project_id) if body.project_id else user_id
    try:
        hum = resolve_model("humanize", body.humanize_model)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    doc = document_repo.create(
        db, project_id=project_id, user_id=user_id, type=body.doc_type,
        tone=body.tone, depth=body.depth, title=body.title, status="generating",
        generation_model=model_used, humanize_model=hum,
    )
    scored = []
    for s in sections:
        score = score_text(s["content_md"])
        scored.append({**s, "ai_score": score["ai_prob"], "human_score": score["human_percent"]})
    rows = document_repo.add_sections(db, doc.id, scored)
    doc.status = "ready"
    db.commit()
    return doc, rows


@router.post("/generate", response_model=GenerateOut)
async def generate(body: GenerateIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        model_used, sections = await generator.generate_sections(
            title=body.title, idea=body.idea, doc_type=body.doc_type,
            tone=body.tone, depth=body.depth, model_override=body.generation_model,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    doc, rows = _persist(db, user_id=str(user.id), body=body, sections=sections, model_used=model_used)
    return GenerateOut(
        document_id=doc.id,
        sections=[SectionOut(id=r.id, title=r.title, order_idx=r.order_idx,
                             content_md=r.content_md, word_count=r.word_count,
                             human_score=float(r.human_score)) for r in rows],
        pages_est=max(1, sum(r.word_count for r in rows) // 150),
    )


@router.post("/generate/stream")
async def generate_stream(body: GenerateIn, user=Depends(get_current_user),
                          db: Session = Depends(get_db)):
    try:
        model_used, sections = await generator.generate_sections(
            title=body.title, idea=body.idea, doc_type=body.doc_type,
            tone=body.tone, depth=body.depth, model_override=body.generation_model,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    doc, rows = _persist(db, user_id=str(user.id), body=body, sections=sections, model_used=model_used)

    async def events():
        yield ":heartbeat\n\n"
        for r in rows:
            yield f"event: section.start\ndata: {json.dumps({'documentId': str(doc.id), 'sectionTitle': r.title})}\n\n"
            for sentence in (r.content_md or "").split(". "):
                if sentence.strip():
                    yield f"event: delta\ndata: {json.dumps({'delta': sentence.strip() + '. '})}\n\n"
            yield f"event: done\ndata: {json.dumps({'documentId': str(doc.id), 'sectionTitle': r.title, 'human_score': float(r.human_score or 0)})}\n\n"
            yield ":heartbeat\n\n"

    return StreamingResponse(events(), media_type="text/event-stream")


@router.post("/generate/regenerate-section")
async def regenerate_section(
    body: RegenerateSectionIn, user=Depends(get_current_user), db: Session = Depends(get_db)
):
    from app.services.detector import count_words

    doc = document_repo.get_owned(db, user_id=str(user.id), document_id=str(body.document_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    model_used, sections = await generator.generate_sections(
        title=body.section_title, idea=body.instruction or doc.title,
        doc_type=doc.type, tone=doc.tone, depth=doc.depth,
        model_override=body.generation_model,
    )
    if not sections:
        raise HTTPException(status_code=502, detail="Model returned nothing")
    fresh = sections[0]
    score = score_text(fresh["content_md"])
    existing = [s for s in document_repo.get_sections(db, str(doc.id)) if s.title == body.section_title]
    if existing:
        row = existing[0]
        row.content_md = fresh["content_md"]
        row.word_count = count_words(fresh["content_md"])
        row.human_score = score["human_percent"]
        row.ai_score = score["ai_prob"]
        db.commit()
        return {"sectionId": row.id, "newContent": row.content_md, "human_score": row.human_score,
                "model": model_used}
    rows = document_repo.add_sections(db, str(doc.id), [{
        "title": body.section_title, "content_md": fresh["content_md"],
        "word_count": count_words(fresh["content_md"]),
        "human_score": score["human_percent"], "ai_score": score["ai_prob"],
    }])
    return {"sectionId": rows[0].id, "newContent": rows[0].content_md,
            "human_score": rows[0].human_score, "model": model_used}
