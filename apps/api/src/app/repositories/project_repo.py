from sqlalchemy.orm import Session

from app.entities.project import Project


def create(db: Session, *, user_id: str, title: str, idea: str | None, slug: str | None) -> Project:
    row = Project(user_id=user_id, title=title, idea=idea, slug=slug)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_for_user(
    db: Session, *, user_id: str, q: str = "", limit: int = 20, offset: int = 0
) -> tuple[list[Project], int]:
    query = db.query(Project).filter(Project.user_id == user_id)
    if q:
        query = query.filter(Project.title.ilike(f"%{q}%"))
    total = query.count()
    return query.order_by(Project.updated_at.desc()).offset(offset).limit(limit).all(), total


def get_owned(db: Session, *, user_id: str, project_id: str) -> Project | None:
    return (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == user_id)
        .first()
    )


def update(db: Session, row: Project, **fields) -> Project:
    for k, v in fields.items():
        if v is not None:
            setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


def delete(db: Session, row: Project) -> None:
    db.delete(row)
    db.commit()
