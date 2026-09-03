"""Single way to fail: fail(status, code, **slots) raises an HTTPException
whose detail is always {"code", "message"}. No raw strings in routes."""
from typing import NoReturn

from fastapi import HTTPException

from app.core.messages import message_for


def fail(status_code: int, code: str, **slots) -> NoReturn:
    raise HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message_for(code, **slots)},
    )
