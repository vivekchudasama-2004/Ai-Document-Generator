"""Signup/login/refresh/forgot/reset. Role is never user-settable —
admins are seeded manually (Appendix D) or promoted via /api/admin."""
import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core import security
from app.entities.user import User
from app.repositories import user_repo


def signup(db: Session, *, email: str, password: str, display_name: str | None) -> User:
    if user_repo.get_by_email(db, email):
        raise ValueError("Email already registered")
    return user_repo.create(
        db, email=email, password_hash=security.hash_password(password),
        display_name=display_name,
    )


def login(db: Session, *, email: str, password: str) -> User:
    user = user_repo.get_by_email(db, email)
    if not user or not user.is_active or not security.verify_password(password, user.password_hash):
        raise ValueError("Invalid credentials")
    return user


def issue_pair(user: User) -> dict:
    sub = str(user.id)
    return {
        "access_token": security.create_access_token(sub, user.role),
        "refresh_token": security.create_refresh_token(sub, user.role),
        "token_type": "bearer",
    }


def refresh(db: Session, refresh_token: str) -> dict:
    principal = security.decode_token(refresh_token, "refresh")
    user = user_repo.get_by_id(db, str(principal.id))
    if not user or not user.is_active:
        raise ValueError("Invalid refresh token")
    return issue_pair(user)  # rotation: new refresh each time


def request_reset(db: Session, email: str, *, app_url: str) -> bool:
    """Always True (anti-enumeration). Sends email only if user exists."""
    user = user_repo.get_by_email(db, email)
    if user:
        token = secrets.token_urlsafe(32)
        user_repo.save_reset_token(
            db, user_id=str(user.id), token=token,
            expires_at=datetime.utcnow() + timedelta(minutes=15),
        )
        _send_email(
            to=user.email,
            subject="DocuForge password reset",
            body=f"Reset link (15 min): {app_url}/reset-password?token={token}",
        )
    return True


def reset_password(db: Session, *, token: str, new_password: str) -> None:
    row = user_repo.consume_reset_token(db, token)
    if not row:
        raise ValueError("Invalid or expired token")
    user = user_repo.get_by_id(db, row.user_id)
    user.password_hash = security.hash_password(new_password)
    db.commit()


def _send_email(*, to: str, subject: str, body: str) -> None:
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.RESEND_API_KEY:
        return  # dev: link would be logged, never raise
    try:
        import resend

        resend.api_key = settings.RESEND_API_KEY
        resend.Emails.send(
            {"from": settings.RESEND_FROM, "to": [to], "subject": subject, "text": body}
        )
    except Exception:
        return
