"""
Application Configuration
-------------------------
Loads environment variables from `.env` file using python-dotenv.
Provides centralized access to configuration settings across the backend.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Locate the root backend directory and load the .env file
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

# Load variables from .env if it exists
load_dotenv(dotenv_path=ENV_PATH)


class Settings:
    """Application settings class."""
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Blood Donor Finder API")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Security / JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fallback-insecure-secret-key")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", "30"))
    PASSWORD_RESET_DEV_MODE: bool = os.getenv("PASSWORD_RESET_DEV_MODE", "false").lower() in ("true", "1", "yes")
    FRONTEND_BASE_URL: str = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./blood_donor_finder.db")

    # Keep local Vite origins allowed while preserving any deployment-specific origins.
    ALLOWED_ORIGINS: list[str] = list(dict.fromkeys([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        *(
            origin.strip()
            for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
            if origin.strip()
        ),
    ]))


# Global settings instance
settings = Settings()
