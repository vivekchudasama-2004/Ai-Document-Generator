import re
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core import error_codes as CODES
from app.core.errors import fail

from app.core.security import get_current_user
from app.db.client import get_db
from app.entities.document import Document
from app.repositories import project_repo

router = APIRouter(tags=["projects"])


def _slug(title: str, project_id: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:60]
    return f"{base}-{project_id[:8]}"


@router.post("/projects", status_code=201)
def create_project(body: dict, user=Depends(get_current_user), db: Session = Depends(get_db)):
    title = (body.get("title") or "").strip()
    if not title:
        fail(422, CODES.PROJECT_TITLE_REQUIRED)
    row = project_repo.create(
        db, user_id=str(user.id), title=title, idea=body.get("idea"), slug=None
    )
    row.slug = _slug(title, row.id)
    db.commit()
    return {"id": row.id, "slug": row.slug, "title": row.title, "created_at": row.created_at}


@router.get("/projects")
def list_projects(
    q: str = "", limit: int = 20, offset: int = 0,
    user=Depends(get_current_user), db: Session = Depends(get_db),
):
    items, total = project_repo.list_for_user(
        db, user_id=str(user.id), q=q, limit=min(limit, 100), offset=offset
    )
    out = []
    for p in items:
        doc_count = db.query(Document).filter(Document.project_id == p.id).count()
        out.append({"id": p.id, "title": p.title, "slug": p.slug, "docCount": doc_count})
    return {"items": out, "total": total}


@router.get("/projects/{project_id}")
def get_project(project_id: UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = project_repo.get_owned(db, user_id=str(user.id), project_id=str(project_id))
    if not row:
        fail(404, CODES.PROJECT_NOT_FOUND)
    docs = db.query(Document).filter(Document.project_id == row.id).all()
    return {
        "id": row.id, "title": row.title, "slug": row.slug, "idea": row.idea,
        "documents": [{"id": d.id, "title": d.title, "type": d.type, "status": d.status} for d in docs],
    }


@router.put("/projects/{project_id}")
def update_project(
    project_id: UUID, body: dict,
    user=Depends(get_current_user), db: Session = Depends(get_db),
):
    row = project_repo.get_owned(db, user_id=str(user.id), project_id=str(project_id))
    if not row:
        fail(404, CODES.PROJECT_NOT_FOUND)
    row = project_repo.update(db, row, title=body.get("title"), idea=body.get("idea"))
    return {"id": row.id, "title": row.title, "idea": row.idea}


@router.delete("/projects/{project_id}")
def delete_project(project_id: UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = project_repo.get_owned(db, user_id=str(user.id), project_id=str(project_id))
    if not row:
        fail(404, CODES.PROJECT_NOT_FOUND)
    project_repo.delete(db, row)
    return {"deleted": True}
