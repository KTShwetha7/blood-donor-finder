import unittest
from datetime import date

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.donor import Donor
from app.models.user import User
from app.routers.auth import get_current_user
from app.routers.donors import get_my_donor_profile, update_my_donor_profile
from app.schemas.donor import DonorUpdate


class DonorProfileTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)

        self.donor_owner = self._make_user("donor-owner", phone="9876543210")
        self.normal_user = self._make_user("regular-user", phone="9123456789")
        self.other_donor_owner = self._make_user("other-donor-owner", phone="9988776655")
        self.db.add_all([self.donor_owner, self.normal_user, self.other_donor_owner])
        self.db.flush()

        self.donor = Donor(
            user_id=self.donor_owner.id,
            blood_group="A+",
            city="Bengaluru",
            state="Karnataka",
            pincode="560001",
            address="123 Test Street, Bengaluru",
            is_available=True,
            last_donation_date=date(2024, 10, 1),
            additional_notes="Original donor note",
        )
        self.other_donor = Donor(
            user_id=self.other_donor_owner.id,
            blood_group="O+",
            city="Mysuru",
            state="Karnataka",
            pincode="570001",
            address="456 Other Street",
            is_available=True,
            additional_notes="Other donor note",
        )
        self.db.add_all([self.donor, self.other_donor])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    @staticmethod
    def _make_user(label, phone):
        return User(
            full_name=label.title().replace("-", " "),
            email=f"{label}@example.test",
            hashed_password="hashed-password",
            phone=phone,
            is_donor=False,
            is_active=True,
        )

    def test_get_my_donor_profile_with_valid_donor_account_returns_safe_fields(self):
        response = get_my_donor_profile(self.db, self.donor_owner)

        self.assertEqual(response.id, self.donor.id)
        self.assertEqual(response.full_name, self.donor_owner.full_name)
        self.assertEqual(response.email, self.donor_owner.email)
        self.assertEqual(response.phone, self.donor_owner.phone)
        self.assertEqual(response.city, self.donor.city)
        self.assertEqual(response.state, self.donor.state)
        self.assertEqual(response.blood_group, self.donor.blood_group)
        self.assertIn("hashed_password", self.donor_owner.__dict__)
        self.assertNotIn("hashed_password", response.model_dump())
        self.assertNotIn("password", response.model_dump())

    def test_get_my_donor_profile_requires_authentication(self):
        with self.assertRaises(HTTPException) as exc:
            get_current_user(None, self.db)
        self.assertEqual(exc.exception.status_code, 401)

    def test_get_my_donor_profile_for_non_donor_account_returns_404(self):
        with self.assertRaises(HTTPException) as exc:
            get_my_donor_profile(self.db, self.normal_user)
        self.assertEqual(exc.exception.status_code, 404)
        self.assertEqual(str(exc.exception.detail), "You are not registered as a donor.")

    def test_put_my_donor_profile_with_valid_data_updates_current_profile(self):
        payload = DonorUpdate(
            full_name="Updated Donor Name",
            phone="9090909090",
            blood_group="O-",
            city="Mysuru",
            state="Karnataka",
            pincode="570002",
            address="Updated donor address in Mysuru",
            is_available=False,
            additional_notes="Updated donor note",
        )

        result = update_my_donor_profile(payload, self.db, self.donor_owner)

        self.assertEqual(result.full_name, "Updated Donor Name")
        self.assertEqual(result.phone, "9090909090")
        self.assertEqual(result.blood_group, "O-")
        self.assertEqual(result.city, "Mysuru")
        self.assertFalse(result.is_available)
        self.assertEqual(result.additional_notes, "Updated donor note")
        self.assertTrue(self.donor_owner.is_donor)

        saved_donor = self.db.query(Donor).filter(Donor.id == self.donor.id).one()
        self.assertEqual(saved_donor.user_id, self.donor_owner.id)
        self.assertEqual(saved_donor.blood_group, "O-")
        self.assertEqual(saved_donor.city, "Mysuru")
        self.assertFalse(saved_donor.is_available)

    def test_put_my_donor_profile_requires_authentication(self):
        with self.assertRaises(HTTPException) as exc:
            get_current_user(None, self.db)
        self.assertEqual(exc.exception.status_code, 401)

    def test_put_my_donor_profile_for_non_donor_account_returns_404(self):
        payload = DonorUpdate(city="Mysuru")

        with self.assertRaises(HTTPException) as exc:
            update_my_donor_profile(payload, self.db, self.normal_user)
        self.assertEqual(exc.exception.status_code, 404)
        self.assertEqual(str(exc.exception.detail), "You are not registered as a donor.")

    def test_put_my_donor_profile_does_not_touch_another_users_record(self):
        original_other_city = self.other_donor.city
        payload = DonorUpdate(city="Chennai", state="Tamil Nadu")

        update_my_donor_profile(payload, self.db, self.donor_owner)

        unchanged_other = self.db.query(Donor).filter(Donor.id == self.other_donor.id).one()
        self.assertEqual(unchanged_other.city, original_other_city)
        self.assertEqual(unchanged_other.user_id, self.other_donor_owner.id)

    def test_invalid_donor_update_payload_raises_validation_error(self):
        with self.assertRaises(ValidationError):
            DonorUpdate(
                full_name="",
                phone="123",
                city=" ",
                state="Karnataka",
                pincode="ABCDE",
                address="Short",
            )

    def test_existing_donor_remains_associated_with_the_correct_user(self):
        donor_row = self.db.query(Donor).filter(Donor.id == self.donor.id).one()
        self.assertEqual(donor_row.user_id, self.donor_owner.id)

    def test_existing_donor_data_is_not_accidentally_deleted(self):
        before = {
            "blood_group": self.donor.blood_group,
            "city": self.donor.city,
            "state": self.donor.state,
            "pincode": self.donor.pincode,
            "address": self.donor.address,
            "is_available": self.donor.is_available,
            "additional_notes": self.donor.additional_notes,
        }

        update_my_donor_profile(DonorUpdate(city="Hubballi", state="Karnataka"), self.db, self.donor_owner)

        after = self.db.query(Donor).filter(Donor.id == self.donor.id).one()
        self.assertEqual(after.blood_group, before["blood_group"])
        self.assertEqual(after.address, before["address"])
        self.assertEqual(after.pincode, before["pincode"])
        self.assertEqual(after.additional_notes, before["additional_notes"])
        self.assertEqual(self.db.query(Donor).count(), 2)


if __name__ == "__main__":
    unittest.main()
