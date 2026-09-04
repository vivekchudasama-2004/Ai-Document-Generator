from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_current_user
from app.db.client import get_db
from app.entities.document import Document
from app.entities.export import Export
from app.entities.project import Project
from app.services.llm.models import list_models

router = APIRouter(tags=["meta"])


@router.get("/meta/models")
def meta_models(current_user=Depends(get_current_user)):
    settings = get_settings()
    return {
        "defaults": {
            "generation": settings.DEFAULT_GENERATION_MODEL,
            "humanize": settings.DEFAULT_HUMANIZE_MODEL,
        },
        "models": list_models(),
        "detector": {"mode": settings.DETECTOR_MODE, "analyzer": "en_core_web_sm+textstat",
                     "demo_mode": settings.DEMO_MODE,
                     "sapling": bool(settings.SAPLING_API_KEY)},
    }


@router.get("/stats")
def workspace_stats(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Cheap COUNT-only totals for the dashboard (no row fetching)."""
    uid = str(user.id)
    return {
        "projects": db.query(Project).filter(Project.user_id == uid).count(),
        "documents": db.query(Document).filter(Document.user_id == uid).count(),
        "exports": db.query(Export).filter(Export.user_id == uid).count(),
    }
