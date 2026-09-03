from sqlalchemy.orm import Session

from app.entities.section import Section


def get_owned(db: Session, *, user_id: str, section_id: str) -> Section | None:
    from app.entities.document import Document

    return (
        db.query(Section)
        .join(Document, Document.id == Section.document_id)
        .filter(Section.id == section_id, Document.user_id == user_id)
        .first()
    )


def update_content(db: Session, row: Section, content_md: str, word_count: int) -> Section:
    row.content_md = content_md
    row.word_count = word_count
    db.commit()
    db.refresh(row)
    return row
