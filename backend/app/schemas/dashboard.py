"""Safe authenticated dashboard response schema."""

from pydantic import BaseModel


class DashboardResponse(BaseModel):
    total_requests: int
    pending_requests: int
    fulfilled_requests: int
    cancelled_requests: int
    has_donor_profile: bool
