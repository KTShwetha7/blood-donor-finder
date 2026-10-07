"""
User Database Model
-------------------
Represents registered users in the SQLite database.
Stores credentials (hashed password only), contact details, and relationships.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    is_donor = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationship to Donor profile (one-to-one)
    donor_profile = relationship("Donor", back_populates="user", uselist=False, cascade="all, delete-orphan")
    blood_requests = relationship("BloodRequest", back_populates="requester")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', is_donor={self.is_donor})>"
