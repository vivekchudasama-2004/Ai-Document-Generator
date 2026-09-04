from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str | None = Field(default=None, max_length=100)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    refresh_token: str = ""  # empty = read the refresh_token cookie (7-day browser sessions)


class MeOut(BaseModel):
    id: UUID
    email: str
    display_name: str | None
    role: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str = Field(min_length=16, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ProfileUpdateIn(BaseModel):
    display_name: str | None = Field(default=None, max_length=100)
    current_password: str | None = Field(default=None, max_length=128)
    new_password: str | None = Field(default=None, min_length=8, max_length=128)
