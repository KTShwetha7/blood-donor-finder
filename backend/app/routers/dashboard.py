"""Authenticated, read-only user dashboard endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.blood_request import BloodRequest
from app.models.donor import Donor
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.dashboard import DashboardResponse

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardResponse:
    """Return request counts and donor-profile status for the authenticated user."""
    counts = (
        db.query(
            func.count(BloodRequest.id).label("total"),
            func.sum(case((BloodRequest.status == "PENDING", 1), else_=0)).label("pending"),
            func.sum(case((BloodRequest.status == "FULFILLED", 1), else_=0)).label("fulfilled"),
            func.sum(case((BloodRequest.status == "CANCELLED", 1), else_=0)).label("cancelled"),
        )
        .filter(BloodRequest.requester_id == current_user.id)
        .one()
    )
    has_donor_profile = (
        db.query(Donor.id)
        .filter(Donor.user_id == current_user.id)
        .first()
        is not None
    )
    return DashboardResponse(
        total_requests=counts.total,
        pending_requests=counts.pending or 0,
        fulfilled_requests=counts.fulfilled or 0,
        cancelled_requests=counts.cancelled or 0,
        has_donor_profile=has_donor_profile,
    )
