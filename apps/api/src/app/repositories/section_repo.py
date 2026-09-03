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


def ordered_siblings(db: Session, document_id: str) -> list[Section]:
    return (
        db.query(Section)
        .filter(Section.document_id == document_id)
        .order_by(Section.order_idx, Section.id)
        .all()
    )


def swap_order(db: Session, first: Section, second: Section) -> None:
    first.order_idx, second.order_idx = second.order_idx, first.order_idx
    db.commit()
