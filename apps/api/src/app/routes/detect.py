from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.humanize import DetectBatchIn, DetectIn
from app.services.detector import detector_ready, score_text

router = APIRouter(tags=["detect"])


@router.post("/detect")
def detect(body: DetectIn, _=Depends(get_current_user)):
    return score_text(body.text)


@router.post("/detect/batch")
def detect_batch(body: DetectBatchIn, _=Depends(get_current_user)):
    return {"results": [
        {"id": item.id, **{k: v for k, v in score_text(item.text).items()
                           if k in ("ai_prob", "human_percent")}}
        for item in body.texts
    ]}


@router.get("/detect/status")
def detect_status(_=Depends(get_current_user)):
    return detector_ready()
