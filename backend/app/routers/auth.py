"""
Authentication Router
---------------------
Handles User Registration, User Login, Token Generation, and User Profile (current user).
"""

from datetime import datetime, timedelta, timezone
from hashlib import sha256
import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.schemas.user import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
)
from app.utils.security import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Bearer token extractor for protected routes
security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to verify JWT token from Authorization header and return authenticated User model.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)

    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with token no longer exists.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account has been deactivated.",
        )

    return user


@router.get("/status")
def auth_router_status():
    """
    Sanity check endpoint for the auth router.
    """
    return {
        "status": "ready",
        "message": "Auth router is initialized and ready for registration/login implementation.",
    }


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    response_model_exclude_none=True,
)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)) -> ForgotPasswordResponse:
    """Create a short-lived reset token without revealing whether an account exists."""
    email = str(request.email).lower()
    user = db.query(User).filter(func.lower(User.email) == email, User.is_active.is_(True)).first()
    raw_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    development_reset_url = None

    if user:
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.invalidated_at.is_(None),
        ).update({"invalidated_at": now}, synchronize_session=False)
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=sha256(raw_token.encode("utf-8")).hexdigest(),
                expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
            )
        )
        db.commit()

    if settings.ENVIRONMENT.lower() == "development" and settings.PASSWORD_RESET_DEV_MODE:
        reset_query = urlencode({"token": raw_token})
        development_reset_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password?{reset_query}"

    return ForgotPasswordResponse(
        message="If an account exists, the reset request has been processed.",
        development_reset_url=development_reset_url,
    )


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)) -> ResetPasswordResponse:
    """Set a new password using a valid single-use reset token."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    token_hash = sha256(request.token.encode("utf-8")).hexdigest()
    reset_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.invalidated_at.is_(None),
        PasswordResetToken.expires_at > now,
    ).first()
    if reset_record is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token is invalid or expired.")

    user = db.query(User).filter(User.id == reset_record.user_id, User.is_active.is_(True)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token is invalid or expired.")

    consumed = db.query(PasswordResetToken).filter(
        PasswordResetToken.id == reset_record.id,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.invalidated_at.is_(None),
        PasswordResetToken.expires_at > now,
    ).update({"used_at": now}, synchronize_session=False)
    if consumed != 1:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token is invalid or expired.")

    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.id != reset_record.id,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.invalidated_at.is_(None),
    ).update({"invalidated_at": now}, synchronize_session=False)
    user.hashed_password = hash_password(request.new_password)
    db.commit()
    return ResetPasswordResponse(message="Your password has been reset. You can now log in.")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)) -> User:
    """Create a user account without creating a donor profile or logging in."""
    normalized_email = str(user_data.email).lower()
    existing_user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        )

    user = User(
        full_name=user_data.full_name.strip(),
        email=normalized_email,
        hashed_password=hash_password(user_data.password),
        phone=user_data.phone,
        address=user_data.address,
        city=user_data.city,
        state=user_data.state,
        pincode=user_data.pincode,
        is_donor=user_data.is_donor,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists.",
        ) from exc

    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login_user(credentials: UserLogin, db: Session = Depends(get_db)) -> dict:
    """Verify credentials and return a JWT with safe user details."""
    normalized_email = str(credentials.email).lower()
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not user.is_active or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": user}
