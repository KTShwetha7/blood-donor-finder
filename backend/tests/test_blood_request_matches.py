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
from app.routers.blood_requests import (
    BLOOD_GROUP_COMPATIBILITY,
    get_blood_request_matches,
)
from app.schemas.donor import BloodRequestDonorMatchResponse


class BloodRequestMatchTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.owner = self._make_user("request-owner")
        self.other_user = self._make_user("other-user")
        self.db.add_all([self.owner, self.other_user])
        self.db.flush()
        self.request = self._make_request(self.owner.id)
        self.other_request = self._make_request(self.other_user.id)
        self.db.add_all([self.request, self.other_request])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def _make_user(self, label, **attributes):
        return User(
            full_name=attributes.get("full_name", label.title()),
            email=f"{label}@example.test",
            hashed_password="test-hash-only",
            phone=attributes.get("phone", "555-0100"),
            is_active=attributes.get("is_active", True),
        )

    @staticmethod
    def _make_request(requester_id, blood_group="A+", city="Bengaluru", state="Karnataka"):
        return BloodRequest(
            requester_id=requester_id,
            blood_group=blood_group,
            units_required=2,
            hospital_name="Protected Request Hospital",
            hospital_address="Private request address",
            city=city,
            state=state,
            pincode="560017",
            required_date=date(2026, 10, 5),
            urgency="HIGH",
            additional_notes="Private requester notes",
            status="PENDING",
        )

    def _add_donor(self, group, city, state, available=True, label=None):
        label = label or f"donor-{self.db.query(User).count()}"
        user = self._make_user(label, full_name=label, phone="555-0199")
        user.is_donor = True
        self.db.add(user)
        self.db.flush()
        donor = Donor(
            user_id=user.id,
            blood_group=group,
            city=city,
            state=state,
            pincode="560018",
            address="Not returned to match endpoint",
            is_available=available,
            last_donation_date=date(2025, 1, 1),
            additional_notes="Donor contact note",
        )
        self.db.add(donor)
        self.db.commit()
        return donor

    def _matches(self, request=None, user=None):
        return get_blood_request_matches(
            (request or self.request).id,
            self.db,
            user or self.owner,
        )

    def test_request_owner_can_get_matches_and_request_data_is_unchanged(self):
        self._add_donor("O+", "Bengaluru", "Karnataka")
        before = (self.request.blood_group, self.request.hospital_name, self.request.status)

        matches = self._matches()

        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0].blood_group, "O+")
        self.assertEqual(before, (self.request.blood_group, self.request.hospital_name, self.request.status))

    def test_unauthenticated_match_request_is_rejected(self):
        with self.assertRaises(HTTPException) as error:
            get_current_user(None, self.db)
        self.assertEqual(error.exception.status_code, 401)

    def test_non_owner_and_missing_request_receive_404(self):
        with self.assertRaises(HTTPException) as forbidden:
            self._matches(user=self.other_user)
        self.assertEqual(forbidden.exception.status_code, 404)
        with self.assertRaises(HTTPException) as missing:
            get_blood_request_matches(9999, self.db, self.owner)
        self.assertEqual(missing.exception.status_code, 404)

    def test_compatibility_map_covers_every_blood_group(self):
        all_groups = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")
        donors = {group: self._add_donor(group, "Bengaluru", "Karnataka") for group in all_groups}

        for requested_group, compatible_groups in BLOOD_GROUP_COMPATIBILITY.items():
            with self.subTest(requested_group=requested_group):
                self.request.blood_group = requested_group
                self.db.commit()
                matches = self._matches()
                self.assertEqual(
                    {match.blood_group for match in matches},
                    set(compatible_groups),
                )
                self.assertEqual(
                    {match.id for match in matches},
                    {donors[group].id for group in compatible_groups},
                )

    def test_incompatible_unavailable_and_inactive_donors_are_excluded(self):
        compatible = self._add_donor("O+", "Bengaluru", "Karnataka", label="available-compatible")
        self._add_donor("AB+", "Bengaluru", "Karnataka", label="incompatible")
        self._add_donor("O+", "Bengaluru", "Karnataka", available=False, label="unavailable-compatible")
        inactive_user = self._make_user("inactive-donor", is_active=False)
        inactive_user.is_donor = True
        self.db.add(inactive_user)
        self.db.flush()
        self.db.add(Donor(
            user_id=inactive_user.id,
            blood_group="O+",
            city="Bengaluru",
            state="Karnataka",
            is_available=True,
        ))
        self.db.commit()

        matches = self._matches()

        self.assertEqual([match.id for match in matches], [compatible.id])

    def test_same_city_then_same_state_then_other_state_are_prioritized(self):
        city_donor = self._add_donor("O+", "Bengaluru", "Karnataka", label="city-donor")
        state_donor = self._add_donor("A+", "Mysuru", "Karnataka", label="state-donor")
        elsewhere_donor = self._add_donor("O+", "Chennai", "Tamil Nadu", label="elsewhere-donor")

        matches = self._matches()

        self.assertEqual(
            [match.id for match in matches],
            [city_donor.id, state_donor.id, elsewhere_donor.id],
        )
        self.assertEqual([match.same_city for match in matches], [True, False, False])

    def test_other_city_compatible_available_donors_are_not_excluded(self):
        donor = self._add_donor("O+", "Chennai", "Tamil Nadu")

        matches = self._matches()

        self.assertEqual([match.id for match in matches], [donor.id])
        self.assertFalse(matches[0].same_city)

    def test_no_compatible_available_donors_returns_empty_list(self):
        self._add_donor("AB+", "Bengaluru", "Karnataka")
        self._add_donor("O+", "Bengaluru", "Karnataka", available=False)

        self.assertEqual(self._matches(), [])

    def test_match_response_contains_only_approved_safe_donor_fields(self):
        self._add_donor("O+", "Bengaluru", "Karnataka")

        response = BloodRequestDonorMatchResponse.model_validate(self._matches()[0]).model_dump()

        self.assertEqual(
            set(response),
            {
                "id", "full_name", "phone", "email", "blood_group", "city", "state",
                "pincode", "is_available", "last_donation_date", "additional_notes",
                "same_city",
            },
        )
        for private_field in ("user_id", "hashed_password", "password", "token", "address"):
            self.assertNotIn(private_field, response)


if __name__ == "__main__":
    unittest.main()
