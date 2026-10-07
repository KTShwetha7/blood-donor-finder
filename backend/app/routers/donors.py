"""
Donor Management & Search Router
--------------------------------
Handles Donor Profile creation, updates, public donor search, and availability toggle.
"""

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.donor import Donor
from app.models.user import User
from app.schemas.donor import DonorCreate, DonorDetailsResponse, DonorResponse, DonorSearchResponse, DonorUpdate, BloodGroup
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/donors", tags=["Donors"])


@router.get("", response_model=list[DonorSearchResponse])
def search_donors(
    blood_group: Optional[BloodGroup] = Query(None),
    city: Optional[str] = Query(None, min_length=1, max_length=100),
    state: Optional[str] = Query(None, min_length=1, max_length=100),
    pincode: Optional[str] = Query(None, pattern=r"^[1-9][0-9]{5}$"),
    is_available: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DonorSearchResponse]:
    """Search active donor profiles using any combination of optional filters."""
    if city is not None and (not city.strip() or len(city.strip()) < 2):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="City must contain at least 2 characters.")
    if state is not None and (not state.strip() or len(state.strip()) < 2):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="State must contain at least 2 characters.")
    if pincode is not None and not re.fullmatch(r"[1-9][0-9]{5}", pincode):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Enter a valid 6-digit Indian PIN code.")

    query = (
        db.query(Donor, User)
        .join(User, Donor.user_id == User.id)
        .filter(User.is_active.is_(True))
    )
    if blood_group is not None:
        query = query.filter(Donor.blood_group == blood_group.value)
    if city is not None:
        query = query.filter(func.lower(Donor.city).contains(city.strip().lower(), autoescape=True))
    if state is not None:
        query = query.filter(func.lower(Donor.state).contains(state.strip().lower(), autoescape=True))
    if pincode is not None:
        query = query.filter(Donor.pincode == pincode)
    if is_available is not None:
        query = query.filter(Donor.is_available.is_(is_available))

    return [
        DonorSearchResponse(
            id=donor.id,
            user_id=donor.user_id,
            donor_name=user.full_name,
            phone=user.phone,
            blood_group=donor.blood_group,
            address=donor.address,
            city=donor.city,
            state=donor.state,
            pincode=donor.pincode,
            is_available=donor.is_available,
            last_donation_date=donor.last_donation_date,
        )
        for donor, user in query.order_by(Donor.id).all()
    ]


@router.get("/status")
def donors_router_status():
    """
    Sanity check endpoint for the donors router.
    """
    return {
        "status": "ready",
        "message": "Donors router is initialized and ready for donor search/profile endpoints.",
    }


@router.get("/me", response_model=DonorDetailsResponse)
def get_my_donor_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DonorDetailsResponse:
    """Return the authenticated user's donor profile."""
    donor = db.query(Donor).filter(Donor.user_id == current_user.id).first()
    if donor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You are not registered as a donor.")

    return DonorDetailsResponse(
        id=donor.id,
        full_name=current_user.full_name,
        email=current_user.email,
        phone=current_user.phone,
        blood_group=donor.blood_group,
        address=donor.address,
        city=donor.city,
        state=donor.state,
        pincode=donor.pincode,
        is_available=donor.is_available,
        last_donation_date=donor.last_donation_date,
        additional_notes=donor.additional_notes,
        created_at=donor.created_at,
    )


@router.put("/me", response_model=DonorDetailsResponse)
def update_my_donor_profile(
    donor_data: DonorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DonorDetailsResponse:
    """Update the authenticated user's donor profile without allowing ownership changes."""
    donor = db.query(Donor).filter(Donor.user_id == current_user.id).first()
    if donor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You are not registered as a donor.")

    if "full_name" in donor_data.model_fields_set:
        current_user.full_name = donor_data.full_name.strip()
    if "phone" in donor_data.model_fields_set:
        current_user.phone = donor_data.phone.strip() if donor_data.phone is not None else None

    if "blood_group" in donor_data.model_fields_set and donor_data.blood_group is not None:
        donor.blood_group = donor_data.blood_group.value
    if "city" in donor_data.model_fields_set:
        donor.city = donor_data.city.strip() if donor_data.city is not None else None
    if "state" in donor_data.model_fields_set:
        donor.state = donor_data.state.strip() if donor_data.state is not None else None
    if "pincode" in donor_data.model_fields_set:
        donor.pincode = donor_data.pincode.strip() if donor_data.pincode is not None else None
    if "address" in donor_data.model_fields_set:
        donor.address = donor_data.address.strip() if donor_data.address is not None else None
    if "is_available" in donor_data.model_fields_set:
        donor.is_available = donor_data.is_available
    if "last_donation_date" in donor_data.model_fields_set:
        donor.last_donation_date = donor_data.last_donation_date
    if "additional_notes" in donor_data.model_fields_set:
        donor.additional_notes = donor_data.additional_notes.strip() if donor_data.additional_notes is not None else None

    current_user.is_donor = True
    db.commit()
    db.refresh(current_user)
    db.refresh(donor)

    return DonorDetailsResponse(
        id=donor.id,
        full_name=current_user.full_name,
        email=current_user.email,
        phone=current_user.phone,
        blood_group=donor.blood_group,
        address=donor.address,
        city=donor.city,
        state=donor.state,
        pincode=donor.pincode,
        is_available=donor.is_available,
        last_donation_date=donor.last_donation_date,
        additional_notes=donor.additional_notes,
        created_at=donor.created_at,
    )


@router.get("/{donor_id}", response_model=DonorDetailsResponse)
def get_donor_details(
    donor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DonorDetailsResponse:
    """Return safe details for one donor profile."""
    result = (
        db.query(Donor, User)
        .join(User, Donor.user_id == User.id)
        .filter(Donor.id == donor_id)
        .first()
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donor not found.")

    donor, user = result
    return DonorDetailsResponse(
        id=donor.id,
        full_name=user.full_name,
        email=user.email,
        phone=user.phone,
        blood_group=donor.blood_group,
        address=donor.address,
        city=donor.city,
        state=donor.state,
        pincode=donor.pincode,
        is_available=donor.is_available,
        last_donation_date=donor.last_donation_date,
        additional_notes=donor.additional_notes,
        created_at=donor.created_at,
    )


@router.post("", response_model=DonorResponse, status_code=status.HTTP_201_CREATED)
def register_donor(
    donor_data: DonorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Donor:
    """Create the authenticated user's one-to-one donor profile."""
    existing_donor = db.query(Donor).filter(Donor.user_id == current_user.id).first()
    if existing_donor:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A donor profile already exists for this account.",
        )

    donor = Donor(
        user_id=current_user.id,
        blood_group=donor_data.blood_group.value,
        city=donor_data.city,
        state=donor_data.state,
        pincode=donor_data.pincode,
        address=donor_data.address,
        is_available=donor_data.is_available,
        last_donation_date=donor_data.last_donation_date,
        additional_notes=donor_data.additional_notes,
    )
    db.add(donor)
    current_user.is_donor = True
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A donor profile already exists for this account.",
        ) from exc

    db.refresh(donor)
    return donor
