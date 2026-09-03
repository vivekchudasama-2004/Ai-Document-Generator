"""JWT + bcrypt auth. JWT carries sub=user UUID + role. Web uses httpOnly
cookie, API uses Authorization: Bearer — both accepted everywhere."""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import Cookie, Depends, Header
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core import error_codes as CODES
from app.core.config import get_settings
from app.core.errors import fail

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


class Principal(BaseModel):
    id: UUID
    role: str


def hash_password(password: str) -> str:
    return pwd_ctx.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_ctx.verify(password, password_hash)


def _encode(sub: str, role: str, expires: timedelta, kind: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": sub,
            "role": role,
            "kind": kind,
            "iat": int(now.timestamp()),
            "exp": int((now + expires).timestamp()),
        },
        get_settings().JWT_SECRET,
        algorithm=ALGORITHM,
    )


def create_access_token(sub: str, role: str) -> str:
    return _encode(sub, role, timedelta(minutes=get_settings().JWT_EXPIRE_MIN), "access")


def create_refresh_token(sub: str, role: str) -> str:
    return _encode(sub, role, timedelta(days=get_settings().REFRESH_EXPIRE_DAYS), "refresh")


def decode_token(token: str, kind: str) -> Principal:
    try:
        payload = jwt.decode(token, get_settings().JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        fail(401, CODES.AUTH_EXPIRED)
    if payload.get("kind") != kind:
        fail(401, CODES.AUTH_EXPIRED)
    try:
        return Principal(id=UUID(payload["sub"]), role=payload.get("role", "user"))
    except (KeyError, ValueError):
        fail(401, CODES.AUTH_EXPIRED)


async def get_current_user(
    authorization: str | None = Header(default=None),
    access_token: str | None = Cookie(default=None),
) -> Principal:
    token: str | None = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:]
    elif access_token:
        token = access_token
    if not token:
        fail(401, CODES.AUTH_REQUIRED)
    return decode_token(token, "access")


async def require_admin(user: Principal = Depends(get_current_user)) -> Principal:
    if user.role != "admin":
        fail(403, CODES.AUTH_FORBIDDEN_ADMIN)
    return user
