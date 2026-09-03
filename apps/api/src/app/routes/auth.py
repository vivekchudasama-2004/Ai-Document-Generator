from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.core.security import get_current_user
from app.db.client import get_db
from app.repositories import user_repo
from app.schemas.auth import (
    ForgotIn, LoginIn, MeOut, RefreshIn, ResetIn, SignupIn, TokenPair,
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
    return TokenPair(**pair)


@router.post("/auth/signup", status_code=201)
@limiter.limit("5/minute")
def signup(body: SignupIn, request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        user = auth_service.signup(
            db, email=body.email, password=body.password, display_name=body.display_name
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return _pair_response(user, response)


@router.post("/auth/login")
@limiter.limit("5/minute")
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        user = auth_service.login(db, email=body.email, password=body.password)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return _pair_response(user, response)


@router.post("/auth/refresh")
def refresh(body: RefreshIn, response: Response, db: Session = Depends(get_db)):
    try:
        pair = auth_service.refresh(db, body.refresh_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    response.set_cookie("access_token", pair["access_token"], max_age=3600, **_cookie_kwargs())
    return pair


@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"logged_out": True}


@router.get("/auth/me", response_model=MeOut)
def me(user=Depends(get_current_user), db: Session = Depends(get_db)):
    row = user_repo.get_by_id(db, str(user.id))
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
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
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"reset": True}
