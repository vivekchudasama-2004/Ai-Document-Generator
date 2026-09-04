from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core import error_codes as CODES
from app.core.config import get_settings
from app.core.errors import fail
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.db.client import get_db
from app.repositories import user_repo
from app.schemas.auth import (
    ForgotIn, LoginIn, MeOut, ProfileUpdateIn, RefreshIn, ResetIn, SignupIn, TokenPair,
)
from app.services import auth_service

router = APIRouter(tags=["auth"])


def _cookie_kwargs() -> dict:
    return {
        "httponly": True,
        "secure": get_settings().COOKIE_SECURE,  # True in prod (https), False local
        "samesite": "lax",
        "path": "/",
    }


def _pair_response(user, response: Response) -> TokenPair:
    pair = auth_service.issue_pair(user)
    response.set_cookie("access_token", pair["access_token"], max_age=3600, **_cookie_kwargs())
    response.set_cookie(
        "refresh_token", pair["refresh_token"],
        max_age=7 * 86400, **_cookie_kwargs(),  # 7-day persistent session
    )
    return TokenPair(**pair)


@router.post("/auth/signup", status_code=201)
@limiter.limit("5/minute")
def signup(body: SignupIn, request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        user = auth_service.signup(
            db, email=body.email, password=body.password, display_name=body.display_name
        )
    except ValueError:
        fail(409, CODES.AUTH_EMAIL_TAKEN)
    return _pair_response(user, response)


@router.post("/auth/login")
@limiter.limit("5/minute")
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        user = auth_service.login(db, email=body.email, password=body.password)
    except ValueError:
        fail(401, CODES.AUTH_BAD_CREDENTIALS)
    return _pair_response(user, response)


@router.post("/auth/refresh")
def refresh(body: RefreshIn, request: Request, response: Response, db: Session = Depends(get_db)):
    token = body.refresh_token or request.cookies.get("refresh_token", "")
    if not token:
        fail(401, CODES.AUTH_BAD_REFRESH)
    try:
        pair = auth_service.refresh(db, token)
    except ValueError:
        fail(401, CODES.AUTH_BAD_REFRESH)
    response.set_cookie("access_token", pair["access_token"], max_age=3600, **_cookie_kwargs())
    response.set_cookie(
        "refresh_token", pair["refresh_token"],
        max_age=7 * 86400, **_cookie_kwargs(),
    )
    return pair


@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"logged_out": True}


@router.get("/auth/me", response_model=MeOut)
def me(user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = user_repo.get_by_id(db, str(user.id))
    if not row:
        fail(404, CODES.AUTH_NO_ACCOUNT)
    return MeOut(id=row.id, email=row.email, display_name=row.display_name, role=row.role)


@router.put("/auth/me", response_model=MeOut)
def update_me(body: ProfileUpdateIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Edit display name and/or rotate password (current password required)."""
    row = user_repo.get_by_id(db, str(user.id))
    if not row:
        fail(404, CODES.AUTH_NO_ACCOUNT)
    if body.new_password:
        if not body.current_password:
            fail(401, CODES.AUTH_BAD_CREDENTIALS)
        try:
            user_repo.change_password(db, row, current_password=body.current_password,
                                      new_password=body.new_password)
        except ValueError:
            fail(401, CODES.AUTH_BAD_CREDENTIALS)
    row = user_repo.update_profile(db, row, display_name=body.display_name)
    return MeOut(id=row.id, email=row.email, display_name=row.display_name, role=row.role)


@router.post("/auth/forgot-password")
@limiter.limit("5/minute")
def forgot(body: ForgotIn, request: Request, db: Session = Depends(get_db)):
    auth_service.request_reset(db, body.email, app_url=get_settings().PUBLIC_APP_URL)
    return {"sent": True}  # always true: anti-enumeration


@router.post("/auth/reset-password")
def reset(body: ResetIn, db: Session = Depends(get_db)):
    try:
        auth_service.reset_password(db, token=body.token, new_password=body.new_password)
    except ValueError:
        fail(400, CODES.AUTH_BAD_RESET)
    return {"reset": True}
