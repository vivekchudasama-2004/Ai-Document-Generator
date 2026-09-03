import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.client import get_db
from app.entities.document import Version
from app.repositories import document_repo, project_repo
from app.services.detector import score_text

router = APIRouter(tags=["documents"])


def _doc_out(row, sections) -> dict:
    scores = [float(s.human_score) for s in sections if s.human_score is not None]
    return {
        "id": row.id, "type": row.type, "tone": row.tone, "depth": row.depth,
        "title": row.title, "status": row.status,
        "generation_model": row.generation_model, "humanize_model": row.humanize_model,
        "human_score_avg": round(sum(scores) / len(scores), 1) if scores else None,
        "sections": [
            {
                "id": s.id, "title": s.title, "order": s.order_idx,
                "content_md": s.content_humanized_md or s.content_md,
                "word_count": s.word_count, "ai_score": s.ai_score,
                "human_score": s.human_score, "iteration": s.iteration,
            }
            for s in sections
        ],
    }


@router.post("/documents", status_code=201)
def create_draft(body: dict, user=Depends(get_current_user), db: Session = Depends(get_db)):
    from app.services.llm.models import resolve_model

    project_id = body.get("project_id")
    if project_id and not project_repo.get_owned(
        db, user_id=str(user.id), project_id=str(project_id)
    ):
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        gen = resolve_model("generate", body.get("generation_model"))
        hum = resolve_model("humanize", body.get("humanize_model"))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    row = document_repo.create(
        db, project_id=str(project_id) if project_id else str(user.id),
        user_id=str(user.id), type=body.get("doc_type", "rdd"),
        tone=body.get("tone", "formal"), depth=body.get("depth", "detailed"),
        title=body.get("title", "Untitled"), status="draft",
        generation_model=gen, humanize_model=hum,
    )
    return {"id": row.id, "status": "draft"}


@router.get("/documents")
def list_docs(
    project_id: str | None = None, type: str | None = None, limit: int = 20,
    user=Depends(get_current_user), db: Session = Depends(get_db),
):
    items, total = document_repo.list_for_user(
        db, user_id=str(user.id), project_id=project_id, doc_type=type,
        limit=min(limit, 100), offset=0,
    )
    return {
        "items": [{"id": d.id, "title": d.title, "type": d.type, "status": d.status} for d in items],
        "total": total,
    }


@router.get("/documents/{document_id}")
def get_doc(
    document_id: UUID, from_section: UUID | None = None,
    user=Depends(get_current_user), db: Session = Depends(get_db),
):
    row = document_repo.get_owned(db, user_id=str(user.id), document_id=str(document_id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    sections = document_repo.get_sections(db, str(document_id))
    if from_section:
        ids = [s.id for s in sections]
        if str(from_section) in ids:
            sections = sections[ids.index(str(from_section)) + 1 :]
    return _doc_out(row, sections)


@router.put("/documents/{document_id}")
def update_doc(
    document_id: UUID, body: dict,
    user=Depends(get_current_user), db: Session = Depends(get_db),
):
    row = document_repo.get_owned(db, user_id=str(user.id), document_id=str(document_id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    for field in ("title", "tone", "depth"):
        if body.get(field):
            setattr(row, field, body[field])
    db.commit()
    return {"id": row.id, "title": row.title}


@router.delete("/documents/{document_id}")
def delete_doc(document_id: UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = document_repo.get_owned(db, user_id=str(user.id), document_id=str(document_id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    document_repo.delete(db, row)
    return {"deleted": True}


@router.get("/documents/{document_id}/versions")
def list_versions(document_id: UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = document_repo.get_owned(db, user_id=str(user.id), document_id=str(document_id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    versions = (
        db.query(Version)
        .filter(Version.document_id == str(document_id))
        .order_by(Version.version_no.desc())
        .all()
    )
    return {"items": [{"version_no": v.version_no, "created_at": v.created_at} for v in versions]}


@router.post("/documents/{document_id}/duplicate")
def duplicate(document_id: UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = document_repo.get_owned(db, user_id=str(user.id), document_id=str(document_id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    sections = document_repo.get_sections(db, str(document_id))
    clone = document_repo.create(
        db, project_id=row.project_id, user_id=str(user.id), type=row.type,
        tone=row.tone, depth=row.depth, title=row.title + " (copy)", status="draft",
        generation_model=row.generation_model, humanize_model=row.humanize_model,
    )
    document_repo.add_sections(db, clone.id, [
        {"title": s.title, "content_md": s.content_md, "word_count": s.word_count}
        for s in sections
    ])
    version = document_repo.snapshot(db, document_id=clone.id,
                                     sections=document_repo.get_sections(db, clone.id))
    return {"newId": clone.id, "version_no": version.version_no}


@router.post("/documents/{document_id}/restore/{version_no}")
def restore(
    document_id: UUID, version_no: int,
    user=Depends(get_current_user), db: Session = Depends(get_db),
):
    row = document_repo.get_owned(db, user_id=str(user.id), document_id=str(document_id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    version = (
        db.query(Version)
        .filter(Version.document_id == str(document_id), Version.version_no == version_no)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    for s in document_repo.get_sections(db, str(document_id)):
        db.delete(s)
    snapshot = json.loads(version.snapshot_json)
    rebuilt = []
    for item in snapshot:
        content = item["content_md"]
        rebuilt.append({
            "title": item["title"], "content_md": content,
            "word_count": len(content.split()),
            "human_score": score_text(content)["human_percent"],
        })
    document_repo.add_sections(db, str(document_id), rebuilt)
    return {"id": row.id, "version_no": version_no, "restored": True}
