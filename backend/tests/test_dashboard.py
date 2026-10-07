import unittest
from datetime import date

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.blood_request import BloodRequest
from app.models.donor import Donor
from app.models.user import User
from app.routers.auth import get_current_user
from app.routers.dashboard import get_dashboard


class DashboardTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.owner = User(full_name="Dashboard Owner", email="dashboard-owner@example.test", hashed_password="owner-hash")
        self.other_user = User(full_name="Other User", email="dashboard-other@example.test", hashed_password="other-hash")
        self.db.add_all([self.owner, self.other_user])
        self.db.flush()
        self.db.add_all([
            self._make_request(self.owner.id, "PENDING"),
            self._make_request(self.owner.id, "FULFILLED"),
            self._make_request(self.owner.id, "CANCELLED"),
            self._make_request(self.other_user.id, "PENDING"),
        ])
        self.db.add(
            Donor(
                user_id=self.owner.id,
                blood_group="A+",
                city="Bengaluru",
                state="Karnataka",
                pincode="560001",
            )
        )
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    @staticmethod
    def _make_request(requester_id, status):
        return BloodRequest(
            requester_id=requester_id,
            blood_group="A+",
            units_required=1,
            hospital_name="Test Hospital",
            hospital_address="1 Main Street",
            city="Bengaluru",
            state="Karnataka",
            pincode="560001",
            required_date=date(2026, 10, 5),
            urgency="HIGH",
            status=status,
        )

    def test_authenticated_dashboard_counts_only_current_users_requests(self):
        result = get_dashboard(self.db, self.owner)

        self.assertEqual(result.total_requests, 3)
        self.assertEqual(result.pending_requests, 1)
        self.assertEqual(result.fulfilled_requests, 1)
        self.assertEqual(result.cancelled_requests, 1)
        self.assertEqual(
            result.total_requests,
            result.pending_requests + result.fulfilled_requests + result.cancelled_requests,
        )
        self.assertTrue(result.has_donor_profile)

    def test_unauthenticated_dashboard_is_rejected(self):
        with self.assertRaises(HTTPException) as error:
            get_current_user(None, self.db)
        self.assertEqual(error.exception.status_code, 401)

    def test_user_without_requests_or_donor_profile_gets_zero_counts(self):
        empty_user = User(
            full_name="Empty User",
            email="dashboard-empty@example.test",
            hashed_password="empty-hash",
        )
        self.db.add(empty_user)
        self.db.commit()

        result = get_dashboard(self.db, empty_user)

        self.assertEqual(result.total_requests, 0)
        self.assertEqual(result.pending_requests, 0)
        self.assertEqual(result.fulfilled_requests, 0)
        self.assertEqual(result.cancelled_requests, 0)
        self.assertFalse(result.has_donor_profile)

    def test_dashboard_response_contains_only_statistics(self):
        result = get_dashboard(self.db, self.owner)

        self.assertEqual(
            set(result.model_dump()),
            {
                "total_requests",
                "pending_requests",
                "fulfilled_requests",
                "cancelled_requests",
                "has_donor_profile",
            },
        )

    def test_dashboard_is_read_only(self):
        before = [
            (request.id, request.requester_id, request.status)
            for request in self.db.query(BloodRequest).order_by(BloodRequest.id).all()
        ]
        user_count = self.db.query(User).count()
        donor_count = self.db.query(Donor).count()

        get_dashboard(self.db, self.owner)
        self.db.expire_all()

        after = [
            (request.id, request.requester_id, request.status)
            for request in self.db.query(BloodRequest).order_by(BloodRequest.id).all()
        ]
        self.assertEqual(after, before)
        self.assertEqual(self.db.query(User).count(), user_count)
        self.assertEqual(self.db.query(Donor).count(), donor_count)

    def test_user_without_donor_profile_is_detected(self):
        self.db.delete(self.db.query(Donor).filter(Donor.user_id == self.owner.id).one())
        self.db.commit()

        self.assertFalse(get_dashboard(self.db, self.owner).has_donor_profile)
