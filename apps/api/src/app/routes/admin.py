from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core import error_codes as CODES
from app.core.errors import fail

from app.core.security import require_admin
from app.db.client import get_db
from app.entities.admin_audit import AdminAudit
from app.entities.document import Document
from app.entities.user import User
from app.repositories import user_repo

router = APIRouter(tags=["admin"])


@router.get("/admin/users")
def admin_users(q: str = "", limit: int = 20, offset: int = 0,
                current_admin=Depends(require_admin), db: Session = Depends(get_db)):
    items, total = user_repo.list_users(db, q=q, limit=min(limit, 100), offset=offset)
    return {"items": [
        {"id": u.id, "email": u.email, "display_name": u.display_name,
         "role": u.role, "created_at": u.created_at} for u in items
    ], "total": total}


@router.put("/admin/users/{user_id}/role")
def admin_set_role(user_id: UUID, body: dict,
                   current_admin=Depends(require_admin), db: Session = Depends(get_db)):
    if body.get("role") not in ("user", "admin"):
        fail(422, CODES.ROLE_INVALID)
    row = user_repo.get_by_id(db, str(user_id))
    if not row:
        fail(404, CODES.AUTH_NO_ACCOUNT)
    old_role = row.role
    row = user_repo.set_role(db, row, body["role"])
    db.add(AdminAudit(actor_id=str(current_admin.id), target_id=row.id,
                      action="role.set", old_role=old_role, new_role=row.role))
    db.commit()
    return {"id": row.id, "role": row.role}


@router.get("/admin/stats")
def admin_stats(current_admin=Depends(require_admin), db: Session = Depends(get_db)):
    import json

    users = db.query(func.count(User.id)).scalar() or 0
    docs = db.query(func.count(Document.id)).scalar() or 0
    by_type = dict(
        db.query(Document.type, func.count(Document.id)).group_by(Document.type).all()
    )
    tokens_by_model: dict[str, int] = {}
    for (usage_json,) in db.query(Document.tokens_used_json).filter(
        Document.tokens_used_json.isnot(None)
    ):
        try:
            usage = json.loads(usage_json)
            model = usage.get("model", "unknown")
            tokens_by_model[model] = tokens_by_model.get(model, 0) + int(
                usage.get("completion_tokens", 0)
            )
        except (ValueError, TypeError, AttributeError):
            continue
    recent_audits = [
        {"actor_id": audit.actor_id, "target_id": audit.target_id,
         "action": audit.action, "old_role": audit.old_role,
         "new_role": audit.new_role, "created_at": audit.created_at}
        for audit in db.query(AdminAudit).order_by(AdminAudit.created_at.desc()).limit(10)
    ]
    return {"users": users, "docs": docs, "tokens_by_model": tokens_by_model,
            "docs_by_type": by_type, "recent_audits": recent_audits}
