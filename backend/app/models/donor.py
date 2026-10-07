"""
Donor Database Model
--------------------
Represents donor-specific details linked to a User.
Stores blood group, city/state location, availability status, and donation history.
"""

from datetime import datetime, timezone, date
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Donor(Base):
    __tablename__ = "donors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    blood_group = Column(String(5), nullable=False, index=True)  # e.g., 'A+', 'O-', 'AB+'
    city = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    pincode = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)

    is_available = Column(Boolean, default=True, index=True)  # Currently ready to donate?
    last_donation_date = Column(Date, nullable=True)
    additional_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationship back to the User model
    user = relationship("User", back_populates="donor_profile")

    def __repr__(self) -> str:
        return f"<Donor(id={self.id}, user_id={self.user_id}, blood_group='{self.blood_group}', city='{self.city}', available={self.is_available})>"
