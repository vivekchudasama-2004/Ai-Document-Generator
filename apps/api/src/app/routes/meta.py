from fastapi import APIRouter, Depends

from app.core.config import get_settings
from app.core.security import get_current_user
from app.services.llm.models import list_models

router = APIRouter(tags=["meta"])


@router.get("/meta/models")
def meta_models(_=Depends(get_current_user)):
    settings = get_settings()
    return {
        "defaults": {
            "generation": settings.DEFAULT_GENERATION_MODEL,
            "humanize": settings.DEFAULT_HUMANIZE_MODEL,
        },
        "models": list_models(),
        "detector": {"mode": settings.DETECTOR_MODE, "analyzer": "en_core_web_sm+textstat"},
    }
