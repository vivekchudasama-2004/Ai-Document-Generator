from sqlalchemy.orm import Session

from app.entities.user import PasswordResetToken, User


def get_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.lower()).first()


def get_by_id(db: Session, user_id: str) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def create(db: Session, *, email: str, password_hash: str, display_name: str | None) -> User:
    user = User(email=email.lower(), password_hash=password_hash, display_name=display_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(db: Session, *, q: str = "", limit: int = 20, offset: int = 0) -> tuple[list[User], int]:
    query = db.query(User)
    if q:
        query = query.filter(User.email.ilike(f"%{q}%"))
    total = query.count()
    return query.order_by(User.created_at.desc()).offset(offset).limit(limit).all(), total


def set_role(db: Session, user: User, role: str) -> User:
    user.role = role
    db.commit()
    db.refresh(user)
    return user


def update_profile(db: Session, user: User, *, display_name: str | None) -> User:
    if display_name is not None:
        user.display_name = display_name.strip() or None
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, *, current_password: str, new_password: str) -> User:
    from app.core import security

    if not security.verify_password(current_password, user.password_hash):
        raise ValueError("Current password is wrong")
    user.password_hash = security.hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user


def save_reset_token(db: Session, *, user_id: str, token: str, expires_at) -> PasswordResetToken:
    row = PasswordResetToken(user_id=user_id, token=token, expires_at=expires_at)
    db.add(row)
    db.commit()
    return row


def consume_reset_token(db: Session, token: str) -> PasswordResetToken | None:
    from datetime import datetime

    row = db.query(PasswordResetToken).filter(PasswordResetToken.token == token).first()
    if not row or row.used or row.expires_at < datetime.utcnow():
        return None
    row.used = True
    db.commit()
    return row
