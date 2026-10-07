"""Authenticated blood request creation endpoint."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.blood_request import BloodRequest
from app.models.donor import Donor
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.donor import BloodRequestDonorMatchResponse
from app.schemas.blood_request import (
    BloodGroup,
    BloodRequestCreate,
    BloodRequestResponse,
    BloodRequestSearchResponse,
    BloodRequestStatus,
    BloodRequestStatusUpdate,
    Urgency,
)

router = APIRouter(prefix="/api/requests", tags=["Blood Requests"])

BLOOD_GROUP_COMPATIBILITY = {
    "A+": ("A+", "O+"),
    "A-": ("A-", "O-"),
    "B+": ("B+", "O+"),
    "B-": ("B-", "O-"),
    "AB+": ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"),
    "AB-": ("A-", "B-", "AB-", "O-"),
    "O+": ("O+", "O-"),
    "O-": ("O-",),
}


@router.get("", response_model=list[BloodRequestResponse])
def list_blood_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BloodRequest]:
    """List blood requests belonging to the authenticated user."""
    return (
        db.query(BloodRequest)
        .filter(BloodRequest.requester_id == current_user.id)
        .order_by(BloodRequest.created_at.desc(), BloodRequest.id.desc())
        .all()
    )


@router.get("/search", response_model=list[BloodRequestSearchResponse])
def search_blood_requests(
    blood_group: BloodGroup | None = None,
    city: str | None = Query(default=None, min_length=1, max_length=100),
    state: str | None = Query(default=None, min_length=1, max_length=100),
    urgency: Urgency | None = None,
    status_filter: BloodRequestStatus | None = Query(default=None, alias="status"),
    pincode: str | None = Query(default=None, pattern=r"^[1-9][0-9]{5}$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BloodRequest]:
    """Search the authenticated user's requests without exposing user details."""
    query = db.query(BloodRequest).filter(BloodRequest.requester_id == current_user.id)
    if blood_group is not None:
        query = query.filter(BloodRequest.blood_group == blood_group.value)
    if city is not None:
        query = query.filter(func.lower(BloodRequest.city) == city.strip().lower())
    if state is not None:
        query = query.filter(func.lower(BloodRequest.state) == state.strip().lower())
    if urgency is not None:
        query = query.filter(BloodRequest.urgency == urgency.value)
    if status_filter is not None:
        query = query.filter(BloodRequest.status == status_filter.value)
    if pincode is not None:
        query = query.filter(BloodRequest.pincode == pincode)
    return query.order_by(BloodRequest.created_at.desc(), BloodRequest.id.desc()).all()


@router.get("/{request_id}", response_model=BloodRequestResponse)
def get_blood_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BloodRequest:
    """Get a blood request only when it belongs to the authenticated user."""
    return _get_owned_blood_request(db, request_id, current_user)


@router.get("/{request_id}/matches", response_model=list[BloodRequestDonorMatchResponse])
def get_blood_request_matches(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BloodRequestDonorMatchResponse]:
    """Find active, available donors compatible with the user's blood request."""
    blood_request = _get_owned_blood_request(db, request_id, current_user)
    compatible_groups = BLOOD_GROUP_COMPATIBILITY[blood_request.blood_group]
    city_match = func.lower(Donor.city) == blood_request.city.strip().lower()
    state_match = func.lower(Donor.state) == blood_request.state.strip().lower()
    results = (
        db.query(Donor, User)
        .join(User, Donor.user_id == User.id)
        .filter(
            Donor.blood_group.in_(compatible_groups),
            Donor.is_available.is_(True),
            User.is_active.is_(True),
        )
        .order_by(
            case((city_match, 0), (state_match, 1), else_=2),
            Donor.id,
        )
        .all()
    )
    return [
        BloodRequestDonorMatchResponse(
            id=donor.id,
            full_name=user.full_name,
            phone=user.phone,
            email=user.email,
            blood_group=donor.blood_group,
            city=donor.city,
            state=donor.state,
            pincode=donor.pincode,
            is_available=donor.is_available,
            last_donation_date=donor.last_donation_date,
            additional_notes=donor.additional_notes,
            same_city=donor.city.strip().lower() == blood_request.city.strip().lower(),
        )
        for donor, user in results
    ]


@router.patch("/{request_id}/status", response_model=BloodRequestResponse)
def update_blood_request_status(
    request_id: int,
    status_data: BloodRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BloodRequest:
    """Apply an allowed status transition to the authenticated user's request."""
    blood_request = _get_owned_blood_request(db, request_id, current_user)
    allowed_transitions = {
        "PENDING": {"FULFILLED", "CANCELLED"},
    }
    next_status = status_data.status.value
    if next_status not in allowed_transitions.get(blood_request.status, set()):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot change a {blood_request.status.lower()} request to {next_status.lower()}.",
        )

    blood_request.status = next_status
    blood_request.updated_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update the blood request status right now. Please try again.",
        ) from exc

    db.refresh(blood_request)
    return blood_request


def _get_owned_blood_request(db: Session, request_id: int, current_user: User) -> BloodRequest:
    blood_request = (
        db.query(BloodRequest)
        .filter(
            BloodRequest.id == request_id,
            BloodRequest.requester_id == current_user.id,
        )
        .first()
    )
    if blood_request is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blood request not found.")
    return blood_request


@router.put("/{request_id}", response_model=BloodRequestResponse)
def update_blood_request(
    request_id: int,
    request_data: BloodRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BloodRequest:
    """Update an authenticated user's blood request without changing its status."""
    blood_request = _get_owned_blood_request(db, request_id, current_user)
    if blood_request.status == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A cancelled blood request cannot be edited.")

    blood_request.blood_group = request_data.blood_group.value
    blood_request.units_required = request_data.units_required
    blood_request.hospital_name = request_data.hospital_name
    blood_request.hospital_address = request_data.hospital_address
    blood_request.city = request_data.city
    blood_request.state = request_data.state
    blood_request.pincode = request_data.pincode
    blood_request.required_date = request_data.required_date
    blood_request.urgency = request_data.urgency.value
    blood_request.additional_notes = request_data.additional_notes
    blood_request.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to update the blood request right now. Please try again.",
        ) from exc

    db.refresh(blood_request)
    return blood_request


@router.delete("/{request_id}", response_model=BloodRequestResponse)
def cancel_blood_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BloodRequest:
    """Cancel an authenticated user's request while retaining its database record."""
    blood_request = _get_owned_blood_request(db, request_id, current_user)
    if blood_request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel a {blood_request.status.lower()} request.",
        )

    blood_request.status = "CANCELLED"
    blood_request.updated_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to cancel the blood request right now. Please try again.",
        ) from exc

    db.refresh(blood_request)
    return blood_request


@router.post("", response_model=BloodRequestResponse, status_code=status.HTTP_201_CREATED)
def create_blood_request(
    request_data: BloodRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BloodRequest:
    """Create a blood request for the authenticated user."""
    blood_request = BloodRequest(
        requester_id=current_user.id,
        blood_group=request_data.blood_group.value,
        units_required=request_data.units_required,
        hospital_name=request_data.hospital_name,
        hospital_address=request_data.hospital_address,
        city=request_data.city,
        state=request_data.state,
        pincode=request_data.pincode,
        required_date=request_data.required_date,
        urgency=request_data.urgency.value,
        additional_notes=request_data.additional_notes,
    )
    db.add(blood_request)
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create the blood request right now. Please try again.",
        ) from exc

    db.refresh(blood_request)
    return blood_request
