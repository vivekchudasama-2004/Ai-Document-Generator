import json
from sqlalchemy.orm import Session

from app.entities.document import Document, Version
from app.entities.section import Section


def create(db: Session, **fields) -> Document:
    row = Document(**fields)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_owned(db: Session, *, user_id: str, document_id: str) -> Document | None:
    return (
        db.query(Document)
        .filter(Document.id == document_id, Document.user_id == user_id)
        .first()
    )


def list_for_user(
    db: Session, *, user_id: str, project_id: str | None = None,
    doc_type: str | None = None, limit: int = 20, offset: int = 0,
) -> tuple[list[Document], int]:
    query = db.query(Document).filter(Document.user_id == user_id)
    if project_id:
        query = query.filter(Document.project_id == project_id)
    if doc_type:
        query = query.filter(Document.type == doc_type)
    total = query.count()
    return query.order_by(Document.updated_at.desc()).offset(offset).limit(limit).all(), total


def add_sections(db: Session, document_id: str, sections: list[dict]) -> list[Section]:
    rows = [
        Section(document_id=document_id, order_idx=i, **s) for i, s in enumerate(sections)
    ]
    db.add_all(rows)
    db.commit()
    return rows


def get_sections(db: Session, document_id: str) -> list[Section]:
    return (
        db.query(Section)
        .filter(Section.document_id == document_id)
        .order_by(Section.order_idx)
        .all()
    )


def snapshot(db: Session, *, document_id: str, sections: list[Section]) -> Version:
    last = (
        db.query(Version)
        .filter(Version.document_id == document_id)
        .order_by(Version.version_no.desc())
        .first()
    )
    version_no = (last.version_no + 1) if last else 1
    row = Version(
        document_id=document_id,
        version_no=version_no,
        snapshot_json=json.dumps(
            [{"title": s.title, "content_md": s.content_md} for s in sections]
        ),
    )
    db.add(row)
    db.commit()
    return row


def delete(db: Session, row: Document) -> None:
    db.delete(row)
    db.commit()
