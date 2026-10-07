"""
Routers Package
---------------
Exports API routers for FastAPI.
"""

from app.routers.auth import router as auth_router
from app.routers.donors import router as donors_router
from app.routers.blood_requests import router as blood_requests_router
from app.routers.dashboard import router as dashboard_router
from app.routers.profile import router as profile_router

__all__ = ["auth_router", "donors_router", "blood_requests_router", "dashboard_router", "profile_router"]
