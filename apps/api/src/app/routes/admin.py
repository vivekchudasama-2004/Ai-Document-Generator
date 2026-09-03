from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.client import get_db
from app.entities.document import Document
from app.entities.user import User
from app.repositories import user_repo

router = APIRouter(tags=["admin"])


@router.get("/admin/users")
def admin_users(q: str = "", limit: int = 20, offset: int = 0,
                _=Depends(require_admin), db: Session = Depends(get_db)):
    items, total = user_repo.list_users(db, q=q, limit=min(limit, 100), offset=offset)
    return {"items": [
        {"id": u.id, "email": u.email, "display_name": u.display_name,
         "role": u.role, "created_at": u.created_at} for u in items
    ], "total": total}


@router.put("/admin/users/{user_id}/role")
def admin_set_role(user_id: UUID, body: dict,
                   _=Depends(require_admin), db: Session = Depends(get_db)):
    if body.get("role") not in ("user", "admin"):
        raise HTTPException(status_code=422, detail="role must be user|admin")
    row = user_repo.get_by_id(db, str(user_id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    row = user_repo.set_role(db, row, body["role"])
    return {"id": row.id, "role": row.role}


@router.get("/admin/stats")
def admin_stats(_=Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(func.count(User.id)).scalar() or 0
    docs = db.query(func.count(Document.id)).scalar() or 0
    by_type = dict(
        db.query(Document.type, func.count(Document.id)).group_by(Document.type).all()
    )
    return {"users": users, "docs": docs, "tokens_by_model": {}, "docs_by_type": by_type}
