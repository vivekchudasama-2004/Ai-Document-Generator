from sqlalchemy.orm import Session

from app.entities.llm_key import LLMKey


def by_user(db: Session, user_id: str) -> list[LLMKey]:
    return (
        db.query(LLMKey)
        .filter(LLMKey.user_id == user_id)
        .order_by(LLMKey.provider, LLMKey.label)
        .all()
    )


def get(db: Session, *, user_id: str, provider: str, label: str) -> LLMKey | None:
    return (
        db.query(LLMKey)
        .filter(
            LLMKey.user_id == user_id,
            LLMKey.provider == provider,
            LLMKey.label == label,
        )
        .first()
    )


def upsert(db: Session, *, user_id: str, provider: str, label: str,
           encrypted_key: str, base_url: str | None) -> LLMKey:
    row = get(db, user_id=user_id, provider=provider, label=label)
    if row:
        row.encrypted_key = encrypted_key
        row.base_url = base_url
    else:
        row = LLMKey(user_id=user_id, provider=provider, label=label,
                     encrypted_key=encrypted_key, base_url=base_url)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete(db: Session, *, user_id: str, key_id: str) -> bool:
    row = (
        db.query(LLMKey)
        .filter(LLMKey.user_id == user_id, LLMKey.id == key_id)
        .first()
    )
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True
