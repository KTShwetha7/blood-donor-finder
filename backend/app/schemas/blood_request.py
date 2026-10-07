"""Blood request validation and safe response schemas."""

import re
from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.donor import BloodGroup


class Urgency(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class BloodRequestStatus(str, Enum):
    PENDING = "PENDING"
    FULFILLED = "FULFILLED"
    CANCELLED = "CANCELLED"


class BloodRequestStatusUpdate(BaseModel):
    status: BloodRequestStatus

    model_config = ConfigDict(extra="forbid")


class BloodRequestCreate(BaseModel):
    blood_group: BloodGroup
    units_required: int = Field(..., strict=True, gt=0)
    hospital_name: str = Field(..., min_length=1, max_length=200)
    hospital_address: str = Field(..., min_length=1, max_length=1000)
    city: str = Field(..., min_length=1, max_length=100)
    state: str = Field(..., min_length=1, max_length=100)
    pincode: str = Field(..., min_length=6, max_length=6)
    required_date: date
    urgency: Urgency
    additional_notes: Optional[str] = Field(None, max_length=2000)

    model_config = ConfigDict(extra="forbid")

    @field_validator("hospital_name", "hospital_address", "city", "state", mode="before")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("This field is required")
        return value

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, value: str) -> str:
        normalized_pincode = value.strip()
        if not re.fullmatch(r"[1-9][0-9]{5}", normalized_pincode):
            raise ValueError("Enter a valid 6-digit Indian PIN code")
        return normalized_pincode

    @field_validator("additional_notes")
    @classmethod
    def normalize_additional_notes(cls, value: Optional[str]) -> Optional[str]:
        if value is not None:
            return value.strip() or None
        return value


class BloodRequestResponse(BaseModel):
    id: int
    requester_id: int
    blood_group: str
    units_required: int
    hospital_name: str
    hospital_address: str
    city: str
    state: str
    pincode: str
    required_date: date
    urgency: str
    additional_notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BloodRequestSearchResponse(BaseModel):
    id: int
    blood_group: str
    units_required: int
    hospital_name: str
    hospital_address: str
    city: str
    state: str
    pincode: str
    required_date: date
    urgency: str
    additional_notes: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
