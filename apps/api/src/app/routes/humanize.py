import difflib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.client import get_db
from app.repositories import document_repo, section_repo
from app.schemas.humanize import HumanizeBatchIn, HumanizeIn, MermaidIn
from app.services import humanizer
from app.services.detector import count_words
from app.services.mermaid import sanitize_svg

router = APIRouter(tags=["humanize"])


@router.post("/humanize")
async def humanize(body: HumanizeIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = section_repo.get_owned(db, user_id=str(user.id), section_id=str(body.section_id))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    result = await humanizer.humanize_text(
        row.content_humanized_md or row.content_md, strength=body.strength,
        model_override=body.humanize_model, max_iterations=body.max_iterations,
    )
    row.content_humanized_md = result["new_content"]
    row.word_count = count_words(result["new_content"])
    row.human_score = result["new_human"]
    row.iteration = result["iterations"]
    db.commit()
    return {"sectionId": row.id, **result, "human_percent_final": result["new_human"]}


@router.post("/humanize/batch")
async def humanize_batch(
    body: HumanizeBatchIn, user=Depends(get_current_user), db: Session = Depends(get_db)
):
    doc = document_repo.get_owned(db, user_id=str(user.id), document_id=str(body.document_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    sections = document_repo.get_sections(db, str(doc.id))
    before = [float(s.human_score or 0) for s in sections]
    updated = 0
    for row in sections:
        if float(row.human_score or 0) >= 95:
            continue
        result = await humanizer.humanize_text(
            row.content_humanized_md or row.content_md, strength=body.strength,
            model_override=body.humanize_model,
        )
        row.content_humanized_md = result["new_content"]
        row.word_count = count_words(result["new_content"])
        row.human_score = result["new_human"]
        row.iteration = result["iterations"]
        updated += 1
    db.commit()
    after = [float(s.human_score or 0) for s in document_repo.get_sections(db, str(doc.id))]
    avg = lambda xs: round(sum(xs) / len(xs), 1) if xs else 0
    return {"documentId": doc.id, "sectionsUpdated": updated,
            "avgHumanBefore": avg(before), "avgHumanAfter": avg(after)}


@router.post("/humanize/compare")
def compare(body: dict, user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = section_repo.get_owned(db, user_id=str(user.id), section_id=str(body.get("section_id", "")))
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    old, new = row.content_md or "", row.content_humanized_md or row.content_md or ""
    unified = "\n".join(difflib.unified_diff(
        old.splitlines(), new.splitlines(), lineterm="", n=3))
    html = difflib.HtmlDiff().make_table(old.splitlines(), new.splitlines())
    return {"diff_unified": unified, "diff_html": html,
            "word_diff": humanizer.word_diff(old, new)}


@router.post("/mermaid/render")
def mermaid_render(body: MermaidIn, current_user=Depends(get_current_user)):
    try:
        return {"svg": sanitize_svg(body.code), "error": None}
    except ValueError as exc:
        return {"svg": None, "error": str(exc)}
