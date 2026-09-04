"""Export MVP: print-CSS HTML (client prints to PDF) + DOCX. Records every
export row; Cloudinary upload when configured, else local data/exports file."""
from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.core import error_codes as CODES
from app.core.errors import fail

from app.core.security import get_current_user
from app.db.client import get_db
from app.entities.export import Export
from app.repositories import document_repo
from app.services import exporter
from app.services.storage.cloudinary_client import upload_bytes

router = APIRouter(tags=["export"])
EXPORT_DIR = Path("data/exports")


@router.post("/export/pdf")
def export_pdf(body: dict, user=Depends(get_current_user), db: Session = Depends(get_db)):
    doc = document_repo.get_owned(db, user_id=str(user.id), document_id=str(body.get("documentId", "")))
    if not doc:
        fail(404, CODES.DOC_NOT_FOUND)
    sections = document_repo.get_sections(db, doc.id)
    html = exporter.build_print_html(title=doc.title, doc_type=doc.type, sections=[
        {"title": s.title, "content_md": s.content_md, "content_humanized_md": s.content_humanized_md}
        for s in sections
    ])
    pages = exporter.paginate([
        {"content_md": s.content_md, "content_humanized_md": s.content_humanized_md}
        for s in sections
    ])
    data = html.encode("utf-8")
    uploaded = upload_bytes(data, public_id=f"docuforge/{doc.id}")
    row = Export(document_id=doc.id, user_id=str(user.id), format="pdf",
                 pages=len(pages), words_total=sum(p["words"] for p in pages))
    if uploaded:
        row.secure_url = uploaded.get("secure_url")
        row.cloudinary_public_id = uploaded.get("public_id")
    else:
        EXPORT_DIR.mkdir(parents=True, exist_ok=True)
        path = EXPORT_DIR / f"{doc.id}.html"
        path.write_bytes(data)
        row.path = str(path)
    db.add(row)
    db.commit()
    avg = ([float(s.human_score or 0) for s in sections])
    return {"exportId": row.id, "secure_url": row.secure_url, "public_id": row.cloudinary_public_id,
            "pages": row.pages, "words_total": row.words_total,
            "human_avg": round(sum(avg) / len(avg), 1) if avg else 0}


@router.post("/export/docx")
def export_docx(body: dict, user=Depends(get_current_user), db: Session = Depends(get_db)):
    doc = document_repo.get_owned(db, user_id=str(user.id), document_id=str(body.get("documentId", "")))
    if not doc:
        fail(404, CODES.DOC_NOT_FOUND)
    sections = document_repo.get_sections(db, doc.id)
    data = exporter.build_docx(title=doc.title, sections=[
        {"title": s.title, "content_md": s.content_md, "content_humanized_md": s.content_humanized_md}
        for s in sections
    ])
    uploaded = upload_bytes(data, public_id=f"docuforge/{doc.id}",
                            resource_type="raw")
    row = Export(document_id=doc.id, user_id=str(user.id), format="docx",
                 words_total=sum(s.word_count for s in sections))
    if uploaded:
        row.secure_url = uploaded.get("secure_url")
        row.cloudinary_public_id = uploaded.get("public_id")
    else:
        EXPORT_DIR.mkdir(parents=True, exist_ok=True)
        path = EXPORT_DIR / f"{doc.id}.docx"
        path.write_bytes(data)
        row.path = str(path)
    db.add(row)
    db.commit()
    return {"exportId": row.id, "secure_url": row.secure_url, "public_id": row.cloudinary_public_id,
            "pages": row.pages, "words_total": row.words_total}


@router.get("/exports")
def list_exports(limit: int = 20, offset: int = 0, cursor: str | None = None,
                 user=Depends(get_current_user), db: Session = Depends(get_db)):
    from app.core.pagination import apply_cursor

    query = db.query(Export).filter(Export.user_id == str(user.id))
    total = query.count()
    if cursor or offset == 0:
        items, next_cursor = apply_cursor(query, Export, cursor, min(limit, 100))
    else:
        items = query.order_by(Export.created_at.desc()).offset(offset).limit(min(limit, 100)).all()
        next_cursor = None
    return {"items": [
        {"id": e.id, "format": e.format, "secure_url": e.secure_url,
         "pages": e.pages, "created_at": e.created_at} for e in items
    ], "total": total, "next_cursor": next_cursor}


@router.get("/exports/{export_id}")
def get_export(export_id: UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(Export)
        .filter(Export.id == str(export_id), Export.user_id == str(user.id))
        .first()
    )
    if not row:
        fail(404, CODES.EXPORT_NOT_FOUND)
    return {"id": row.id, "format": row.format, "secure_url": row.secure_url,
            "public_id": row.cloudinary_public_id, "pages": row.pages,
            "created_at": row.created_at}


@router.get("/exports/{export_id}/download")
def download_export(export_id: UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = (
        db.query(Export)
        .filter(Export.id == str(export_id), Export.user_id == str(user.id))
        .first()
    )
    if not row:
        fail(404, CODES.EXPORT_NOT_FOUND)
    if row.secure_url:
        return RedirectResponse(row.secure_url, status_code=302)
    if row.path and Path(row.path).exists():
        media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
            if row.format == "docx" else "text/html"
        return FileResponse(row.path, media_type=media, filename=f"{row.document_id}.{row.format}")
    fail(404, CODES.EXPORT_FILE_GONE)
