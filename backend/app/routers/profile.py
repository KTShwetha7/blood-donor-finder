"""Authenticated endpoints for the current user's safe profile fields."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.user import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get("", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)) -> User:
    """Return safe profile information for the user identified by the JWT."""
    return current_user


@router.put("", response_model=ProfileResponse)
def update_profile(
    profile_data: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> User:
    """Update only the authenticated user's name and phone."""
    current_user.full_name = profile_data.full_name
    current_user.phone = profile_data.phone
    db.commit()
    db.refresh(current_user)
    return current_user
