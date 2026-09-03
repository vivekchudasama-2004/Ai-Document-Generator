from sqlalchemy.orm import Session

from app.entities.user_model import UserModel


def enabled_ids(db: Session, user_id: str) -> list[str]:
    rows = (
        db.query(UserModel.model_id)
        .filter(UserModel.user_id == user_id, UserModel.enabled.is_(True))
        .all()
    )
    return [row[0] for row in rows]


def set_enabled(db: Session, *, user_id: str, model_id: str, enabled: bool) -> UserModel | None:
    row = (
        db.query(UserModel)
        .filter(UserModel.user_id == user_id, UserModel.model_id == model_id)
        .first()
    )
    if not enabled:
        if row:
            db.delete(row)
            db.commit()
        return None
    if row:
        row.enabled = True
    else:
        row = UserModel(user_id=user_id, model_id=model_id, enabled=True)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row
