"""
Donor Pydantic Schemas
----------------------
Defines request validation and response models for donor profiles and search queries.
"""

from datetime import datetime, date
import re
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict, field_validator
from app.schemas.user import UserResponse


class BloodGroup(str, Enum):
    A_POSITIVE = "A+"
    A_NEGATIVE = "A-"
    B_POSITIVE = "B+"
    B_NEGATIVE = "B-"
    AB_POSITIVE = "AB+"
    AB_NEGATIVE = "AB-"
    O_POSITIVE = "O+"
    O_NEGATIVE = "O-"


# Schema to create a Donor Profile
class DonorCreate(BaseModel):
    blood_group: BloodGroup = Field(..., description="Donor's blood group (e.g. A+, O-, etc.)")
    city: str = Field(..., min_length=2, max_length=100, description="City where donor resides")
    state: str = Field(..., min_length=2, max_length=100, description="State / Province")
    pincode: Optional[str] = Field(None, max_length=20, description="Six-digit PIN code")
    address: str = Field(..., min_length=10, max_length=1000, description="Full manually entered address")
    is_available: bool = Field(default=True, description="Availability to donate blood right now")
    last_donation_date: Optional[date] = Field(None, description="Date of last blood donation")
    additional_notes: Optional[str] = Field(None, max_length=500, description="Additional medical/contact notes")

    model_config = ConfigDict(extra="forbid")

    @field_validator("city", "state", "address", mode="before")
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
    def validate_pincode(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            normalized_pincode = value.strip()
            if not re.fullmatch(r"[1-9][0-9]{5}", normalized_pincode):
                raise ValueError("Enter a valid 6-digit Indian PIN code")
            return normalized_pincode
        return value

    @field_validator("last_donation_date")
    @classmethod
    def validate_last_donation_date(cls, value: Optional[date]) -> Optional[date]:
        if value is not None and value > date.today():
            raise ValueError("Last donation date cannot be in the future")
        return value


# Schema to update a Donor Profile
class DonorUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100, description="Full name of the donor/user")
    phone: Optional[str] = Field(None, min_length=10, max_length=20, description="Contact phone number")
    blood_group: Optional[BloodGroup] = None
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    state: Optional[str] = Field(None, min_length=2, max_length=100)
    pincode: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, min_length=10, max_length=1000)
    is_available: Optional[bool] = None
    last_donation_date: Optional[date] = None
    additional_notes: Optional[str] = None

    model_config = ConfigDict(extra="forbid")

    @field_validator("full_name", mode="before")
    @classmethod
    def strip_full_name(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and isinstance(value, str):
            trimmed_value = value.strip()
            if not trimmed_value:
                raise ValueError("Full name cannot be blank")
            return trimmed_value
        return value

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not re.fullmatch(r"[6-9][0-9]{9}", value):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return value

    @field_validator("city", "state", "address")
    @classmethod
    def validate_optional_location_text(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            normalized_value = value.strip()
            if not normalized_value:
                raise ValueError("This field cannot be blank")
            return normalized_value
        return value

    @field_validator("pincode")
    @classmethod
    def validate_optional_pincode(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            normalized_pincode = value.strip()
            if not re.fullmatch(r"[1-9][0-9]{5}", normalized_pincode):
                raise ValueError("Enter a valid 6-digit Indian PIN code")
            return normalized_pincode
        return value

    @field_validator("last_donation_date")
    @classmethod
    def validate_optional_last_donation_date(cls, value: Optional[date]) -> Optional[date]:
        if value is not None and value > date.today():
            raise ValueError("Last donation date cannot be in the future")
        return value


# Schema for Donor Profile Response
class DonorResponse(BaseModel):
    id: int
    user_id: int
    blood_group: str
    city: str
    state: str
    pincode: Optional[str] = None
    address: Optional[str] = None
    is_available: bool
    last_donation_date: Optional[date] = None
    additional_notes: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


class DonorSearchResponse(BaseModel):
    id: int
    user_id: int
    donor_name: str
    phone: Optional[str] = None
    blood_group: str
    address: Optional[str] = None
    city: str
    state: str
    pincode: Optional[str] = None
    is_available: bool
    last_donation_date: Optional[date] = None


class BloodRequestDonorMatchResponse(BaseModel):
    id: int
    full_name: str
    phone: Optional[str] = None
    email: str
    blood_group: str
    city: str
    state: str
    pincode: Optional[str] = None
    is_available: bool
    last_donation_date: Optional[date] = None
    additional_notes: Optional[str] = None
    same_city: bool


class DonorDetailsResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    blood_group: str
    address: Optional[str] = None
    city: str
    state: str
    pincode: Optional[str] = None
    is_available: bool
    last_donation_date: Optional[date] = None
    additional_notes: Optional[str] = None
    created_at: datetime
