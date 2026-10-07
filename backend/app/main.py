"""
Main FastAPI Application Entry Point
-------------------------------------
- Creates the database tables on startup (SQLite)
- Configures CORS for React Frontend communication
- Registers all API routers (/api/auth, /api/donors, /api/requests)
- Exposes API health check & diagnostic endpoints
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base, get_db, migrate_sqlite_user_location_columns
# Import models so Base.metadata is aware of all tables before create_all
import app.models  # noqa: F401
from app.routers import auth_router, blood_requests_router, dashboard_router, donors_router, profile_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan Events:
    Runs when the server starts up and shuts down.
    """
    # 1. Automatically create database tables if they don't exist
    print(" Creating SQLite database tables if not present...")
    Base.metadata.create_all(bind=engine)
    migrate_sqlite_user_location_columns()
    print(" SQLite database tables ready.")
    yield
    # Cleanup on shutdown
    print(" Application shutting down.")


# Initialize FastAPI instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Blood Donor Finder Application built with FastAPI, SQLAlchemy & SQLite.",
    version="1.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
# This allows the React development server (Vite on http://localhost:5173) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth_router)
app.include_router(donors_router)
app.include_router(blood_requests_router)
app.include_router(dashboard_router)
app.include_router(profile_router)


@app.get("/", tags=["General"])
def root_endpoint():
    """
    Root endpoint for basic sanity check.
    """
    return {
        "message": "Welcome to Blood Donor Finder API",
        "docs": "/docs",
        "health": "/api/health",
        "status": "online",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/api/health", tags=["General"])
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint:
    Verifies that the FastAPI server is running and the SQLite database connection is operational.
    """
    db_status = "connected"
    try:
        # Execute a simple test query to verify SQLite connection
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": {
            "type": "SQLite",
            "status": db_status,
            "url": settings.DATABASE_URL.split("///")[-1] if "///" in settings.DATABASE_URL else settings.DATABASE_URL,
        },
        "api_version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth/status",
            "donors": "/api/donors/status",
            "docs": "/docs",
        },
    }
