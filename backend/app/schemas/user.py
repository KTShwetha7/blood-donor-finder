"""
User Pydantic Schemas
---------------------
Defines request validation and response serialisation schemas for Users and Authentication.
Ensures sensitive data (like hashed passwords) is never returned in API responses.
"""

from datetime import datetime
import re
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator, model_validator


# Schema for User Registration Request
class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name of the user")
    email: EmailStr = Field(..., max_length=255, description="Valid email address")
    password: str = Field(..., min_length=6, max_length=100, description="Password (at least 6 characters)")
    confirm_password: str = Field(..., min_length=6, max_length=100, description="Password confirmation")
    phone: str = Field(..., min_length=10, max_length=20, description="Contact phone number")
    address: str = Field(..., min_length=10, max_length=1000, description="Full manually entered address")
    city: str = Field(..., min_length=2, max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    pincode: str = Field(..., min_length=6, max_length=6, description="Six-digit PIN code")
    is_donor: bool = Field(default=False, description="Whether the user wants to register as a donor")

    @field_validator("full_name", "email", mode="before")
    @classmethod
    def strip_identity_text(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @field_validator("password")
    @classmethod
    def reject_blank_password(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Password cannot contain only spaces")
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        if not re.fullmatch(r"[6-9][0-9]{9}", value):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return value

    @field_validator("address", "city", "state", mode="before")
    @classmethod
    def validate_location_text(cls, value: str) -> str:
        if not isinstance(value, str):
            return value
        normalized_value = value.strip()
        if not normalized_value:
            raise ValueError("This field is required")
        return normalized_value

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, value: str) -> str:
        if not re.fullmatch(r"[1-9][0-9]{5}", value):
            raise ValueError("Enter a valid 6-digit Indian PIN code")
        return value

    @model_validator(mode="after")
    def validate_password_confirmation(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


# Schema for User Login Request
class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., min_length=1, description="Account password")

    @field_validator("email", mode="before")
    @classmethod
    def strip_login_email(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


# Schema for User Response (Safe public fields only)
class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    is_active: bool
    is_donor: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name of the user")
    phone: Optional[str] = Field(..., min_length=10, max_length=20, description="Contact phone number")

    model_config = ConfigDict(extra="forbid")

    @field_validator("full_name", mode="before")
    @classmethod
    def strip_profile_name(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_profile_phone(cls, value: Optional[str]) -> Optional[str]:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("phone")
    @classmethod
    def validate_profile_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not re.fullmatch(r"[6-9][0-9]{9}", value):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return value


class ProfileResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# Schema for Authentication Token
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Schema for Token Payload Data
class TokenPayload(BaseModel):
    sub: Optional[str] = None  # user_id or email stored in 'sub' claim
    exp: Optional[int] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email", mode="before")
    @classmethod
    def strip_forgot_password_email(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class ForgotPasswordResponse(BaseModel):
    message: str
    development_reset_url: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=32, max_length=256)
    new_password: str = Field(..., min_length=6, max_length=100)
    confirm_password: str = Field(..., min_length=6, max_length=100)

    @field_validator("new_password")
    @classmethod
    def reject_blank_reset_password(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Password cannot contain only spaces")
        return value

    @model_validator(mode="after")
    def validate_reset_password_confirmation(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class ResetPasswordResponse(BaseModel):
    message: str
