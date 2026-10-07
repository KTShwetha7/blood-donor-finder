import unittest
from datetime import date, datetime

from fastapi import HTTPException
from pydantic import ValidationError
from pydantic import TypeAdapter
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.blood_request import BloodRequest
from app.models.user import User
from app.routers.auth import get_current_user
from app.routers.blood_requests import (
    create_blood_request,
    cancel_blood_request,
    get_blood_request,
    list_blood_requests,
    search_blood_requests,
    update_blood_request,
    update_blood_request_status,
)
from app.schemas.donor import BloodGroup
from app.schemas.blood_request import (
    BloodRequestCreate,
    BloodRequestResponse,
    BloodRequestSearchResponse,
    BloodRequestStatus,
    BloodRequestStatusUpdate,
    Urgency,
)


class BloodRequestListingTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.owner = User(full_name="Request Owner", email="owner@example.test", hashed_password="owner-hash")
        self.other_user = User(full_name="Other User", email="other@example.test", hashed_password="other-hash")
        self.db.add_all([self.owner, self.other_user])
        self.db.flush()
        self.owned_request = self._make_request(self.owner.id)
        self.other_request = self._make_request(self.other_user.id)
        self.db.add_all([self.owned_request, self.other_request])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    @staticmethod
    def _make_request(requester_id, **overrides):
        values = {
            "requester_id": requester_id,
            "blood_group": "A+",
            "units_required": 1,
            "hospital_name": "City Hospital",
            "hospital_address": "1 Main Street",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560001",
            "required_date": date(2026, 10, 5),
            "urgency": "HIGH",
            "additional_notes": None,
            "status": "PENDING",
        }
        values.update(overrides)
        return BloodRequest(**values)

    def _search(self, **filters):
        return search_blood_requests(
            blood_group=filters.get("blood_group"),
            city=filters.get("city"),
            state=filters.get("state"),
            urgency=filters.get("urgency"),
            status_filter=filters.get("status_filter"),
            pincode=filters.get("pincode"),
            db=self.db,
            current_user=self.owner,
        )

    def _add_search_fixture(self):
        extra_request = self._make_request(
            self.owner.id,
            blood_group="B-",
            city="Mysuru",
            state="Tamil Nadu",
            pincode="570001",
            urgency="LOW",
            status="CANCELLED",
        )
        self.db.add(extra_request)
        self.db.commit()
        return extra_request

    def test_list_returns_only_authenticated_users_requests_and_safe_fields(self):
        requests = list_blood_requests(self.db, self.owner)
        self.assertEqual([request.id for request in requests], [self.owned_request.id])
        response = BloodRequestResponse.model_validate(requests[0]).model_dump()
        self.assertNotIn("hashed_password", response)
        self.assertNotIn("password", response)
        self.assertEqual(response["hospital_name"], "City Hospital")

    def test_unauthenticated_request_is_rejected(self):
        with self.assertRaises(HTTPException) as error:
            get_current_user(None, self.db)
        self.assertEqual(error.exception.status_code, 401)

    def test_owner_can_get_details_but_other_user_cannot(self):
        result = get_blood_request(self.owned_request.id, self.db, self.owner)
        self.assertEqual(result.id, self.owned_request.id)
        with self.assertRaises(HTTPException) as error:
            get_blood_request(self.owned_request.id, self.db, self.other_user)
        self.assertEqual(error.exception.status_code, 404)

    def test_empty_list_is_returned_for_user_without_requests(self):
        self.assertEqual(list_blood_requests(self.db, User(id=999)), [])

    def test_search_without_filters_returns_only_current_users_requests(self):
        extra_request = self._make_request(
            self.owner.id,
            blood_group="B-",
            city="Mysuru",
            state="Tamil Nadu",
            pincode="570001",
            urgency="LOW",
            status="CANCELLED",
        )
        self.db.add(extra_request)
        self.db.commit()

        results = self._search()

        self.assertEqual({request.id for request in results}, {self.owned_request.id, extra_request.id})

    def test_search_filters_blood_group_case_insensitive_city_and_state(self):
        self._add_search_fixture()
        self.assertEqual([item.id for item in self._search(blood_group=BloodGroup.A_POSITIVE)], [self.owned_request.id])
        self.assertEqual([item.id for item in self._search(city="bEnGaLuRu")], [self.owned_request.id])
        self.assertEqual([item.id for item in self._search(state="kArNaTaKa")], [self.owned_request.id])

    def test_search_filters_urgency_status_and_pincode(self):
        extra_request = self._add_search_fixture()
        self.assertEqual([item.id for item in self._search(urgency=Urgency.LOW)], [extra_request.id])
        self.assertEqual([item.id for item in self._search(status_filter=BloodRequestStatus.CANCELLED)], [extra_request.id])
        self.assertEqual([item.id for item in self._search(pincode="570001")], [extra_request.id])

    def test_search_combines_filters_with_and_logic_and_returns_empty_for_no_match(self):
        self._add_search_fixture()
        matches = self._search(
            blood_group=BloodGroup.A_POSITIVE,
            city="BENGALURU",
            urgency=Urgency.HIGH,
            status_filter=BloodRequestStatus.PENDING,
            pincode="560001",
        )
        self.assertEqual([item.id for item in matches], [self.owned_request.id])
        self.assertEqual(self._search(city="No Such City"), [])

    def test_search_response_omits_requester_and_user_credentials(self):
        result = self._search()[0]
        response = BloodRequestSearchResponse.model_validate(result).model_dump()
        self.assertEqual(
            set(response),
            {
                "id", "blood_group", "units_required", "hospital_name", "hospital_address",
                "city", "state", "pincode", "required_date", "urgency", "additional_notes",
                "status", "created_at", "updated_at",
            },
        )
        self.assertNotIn("requester_id", response)
        self.assertNotIn("hashed_password", response)
        self.assertNotIn("password", response)

    def test_invalid_search_enum_values_are_rejected(self):
        for adapter, value in (
            (TypeAdapter(BloodGroup), "XX"),
            (TypeAdapter(Urgency), "ASAP"),
            (TypeAdapter(BloodRequestStatus), "DELETED"),
        ):
            with self.subTest(value=value), self.assertRaises(ValidationError):
                adapter.validate_python(value)
        with self.assertRaises(ValidationError):
            BloodRequestCreate.model_validate({**self._request_payload().model_dump(), "pincode": "invalid"})

    def test_existing_creation_handler_still_creates_for_authenticated_user(self):
        payload = BloodRequestCreate(
            blood_group="O+",
            units_required=2,
            hospital_name="Test Hospital",
            hospital_address="2 Main Street",
            city="Mysuru",
            state="Karnataka",
            pincode="570001",
            required_date=date(2026, 10, 6),
            urgency="MEDIUM",
            additional_notes=None,
        )
        created = create_blood_request(payload, self.db, self.owner)
        self.assertEqual(created.requester_id, self.owner.id)
        self.assertEqual(created.blood_group, "O+")

    def test_owner_can_update_request_and_status_and_owner_are_preserved(self):
        self.owned_request.updated_at = datetime(2020, 1, 1)
        self.db.commit()
        original_updated_at = self.owned_request.updated_at
        payload = self._request_payload(
            blood_group="B+",
            units_required=3,
            hospital_name="Updated Hospital",
        )

        updated = update_blood_request(self.owned_request.id, payload, self.db, self.owner)

        self.assertEqual(updated.requester_id, self.owner.id)
        self.assertEqual(updated.blood_group, "B+")
        self.assertEqual(updated.units_required, 3)
        self.assertEqual(updated.hospital_name, "Updated Hospital")
        self.assertEqual(updated.status, "PENDING")
        self.assertNotEqual(updated.updated_at, original_updated_at)

    def test_other_user_cannot_update_request(self):
        original_hospital = self.owned_request.hospital_name
        with self.assertRaises(HTTPException) as error:
            update_blood_request(
                self.owned_request.id,
                self._request_payload(hospital_name="Unauthorized Change"),
                self.db,
                self.other_user,
            )
        self.assertEqual(error.exception.status_code, 404)
        self.db.refresh(self.owned_request)
        self.assertEqual(self.owned_request.hospital_name, original_hospital)

    def test_owner_can_cancel_without_deleting_request(self):
        original_count = self.db.query(BloodRequest).count()
        cancelled = cancel_blood_request(self.owned_request.id, self.db, self.owner)

        self.assertEqual(cancelled.status, "CANCELLED")
        self.assertEqual(cancelled.requester_id, self.owner.id)
        self.assertEqual(self.db.query(BloodRequest).count(), original_count)

    def test_fulfilled_request_cannot_be_cancelled(self):
        self.owned_request.status = "FULFILLED"
        self.db.commit()

        with self.assertRaises(HTTPException) as error:
            cancel_blood_request(self.owned_request.id, self.db, self.owner)

        self.assertEqual(error.exception.status_code, 409)
        self.db.refresh(self.owned_request)
        self.assertEqual(self.owned_request.status, "FULFILLED")

    def test_other_user_cannot_cancel_request(self):
        with self.assertRaises(HTTPException) as error:
            cancel_blood_request(self.owned_request.id, self.db, self.other_user)
        self.assertEqual(error.exception.status_code, 404)
        self.db.refresh(self.owned_request)
        self.assertEqual(self.owned_request.status, "PENDING")

    def test_missing_request_cannot_be_updated_or_cancelled(self):
        payload = self._request_payload()
        for operation in (
            lambda: update_blood_request(9999, payload, self.db, self.owner),
            lambda: cancel_blood_request(9999, self.db, self.owner),
        ):
            with self.subTest(operation=operation):
                with self.assertRaises(HTTPException) as error:
                    operation()
                self.assertEqual(error.exception.status_code, 404)

    def test_edit_payload_uses_creation_validation_and_forbids_owner_override(self):
        with self.assertRaises(ValidationError):
            self._request_payload(units_required=0)
        with self.assertRaises(ValidationError):
            self._request_payload(pincode="000000")
        with self.assertRaises(ValidationError):
            self._request_payload(requester_id=self.other_user.id)

    def test_cancelled_request_cannot_be_edited(self):
        self.owned_request.status = "CANCELLED"
        self.db.commit()

        with self.assertRaises(HTTPException) as error:
            update_blood_request(
                self.owned_request.id,
                self._request_payload(hospital_name="No longer editable"),
                self.db,
                self.owner,
            )
        self.assertEqual(error.exception.status_code, 409)

    def test_owner_can_mark_pending_request_fulfilled(self):
        self.owned_request.updated_at = datetime(2020, 1, 1)
        self.db.commit()
        original_updated_at = self.owned_request.updated_at

        result = update_blood_request_status(
            self.owned_request.id,
            BloodRequestStatusUpdate(status="FULFILLED"),
            self.db,
            self.owner,
        )

        self.assertEqual(result.status, "FULFILLED")
        self.assertEqual(result.requester_id, self.owner.id)
        self.assertNotEqual(result.updated_at, original_updated_at)

    def test_owner_can_mark_pending_request_cancelled(self):
        result = update_blood_request_status(
            self.owned_request.id,
            BloodRequestStatusUpdate(status="CANCELLED"),
            self.db,
            self.owner,
        )

        self.assertEqual(result.status, "CANCELLED")
        self.assertEqual(result.requester_id, self.owner.id)

    def test_terminal_statuses_cannot_transition(self):
        for current_status, next_status in (
            ("FULFILLED", "PENDING"),
            ("CANCELLED", "PENDING"),
            ("FULFILLED", "CANCELLED"),
            ("CANCELLED", "FULFILLED"),
        ):
            with self.subTest(current_status=current_status, next_status=next_status):
                self.owned_request.status = current_status
                self.db.commit()
                with self.assertRaises(HTTPException) as error:
                    update_blood_request_status(
                        self.owned_request.id,
                        BloodRequestStatusUpdate(status=next_status),
                        self.db,
                        self.owner,
                    )
                self.assertEqual(error.exception.status_code, 409)
                self.db.refresh(self.owned_request)
                self.assertEqual(self.owned_request.status, current_status)

    def test_another_user_cannot_change_request_status(self):
        with self.assertRaises(HTTPException) as error:
            update_blood_request_status(
                self.owned_request.id,
                BloodRequestStatusUpdate(status="FULFILLED"),
                self.db,
                self.other_user,
            )
        self.assertEqual(error.exception.status_code, 404)
        self.db.refresh(self.owned_request)
        self.assertEqual(self.owned_request.status, "PENDING")

    def test_missing_request_cannot_have_status_changed(self):
        with self.assertRaises(HTTPException) as error:
            update_blood_request_status(
                99999,
                BloodRequestStatusUpdate(status="FULFILLED"),
                self.db,
                self.owner,
            )
        self.assertEqual(error.exception.status_code, 404)

    def test_status_endpoint_auth_dependency_rejects_missing_credentials(self):
        with self.assertRaises(HTTPException) as error:
            get_current_user(None, self.db)
        self.assertEqual(error.exception.status_code, 401)

    def test_status_update_rejects_invalid_and_protected_fields(self):
        with self.assertRaises(ValidationError):
            BloodRequestStatusUpdate(status="UNKNOWN")
        with self.assertRaises(ValidationError):
            BloodRequestStatusUpdate(status="FULFILLED", requester_id=self.other_user.id)
        with self.assertRaises(ValidationError):
            BloodRequestStatusUpdate(status="FULFILLED", hospital_name="Changed Hospital")

    def test_status_update_response_contains_only_safe_blood_request_fields(self):
        result = update_blood_request_status(
            self.owned_request.id,
            BloodRequestStatusUpdate(status="FULFILLED"),
            self.db,
            self.owner,
        )
        response = BloodRequestResponse.model_validate(result).model_dump()
        self.assertIn("status", response)
        self.assertNotIn("hashed_password", response)
        self.assertNotIn("password", response)
        self.assertNotIn("token", response)

    @staticmethod
    def _request_payload(**overrides):
        values = {
            "blood_group": "A+",
            "units_required": 1,
            "hospital_name": "City Hospital",
            "hospital_address": "1 Main Street",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560001",
            "required_date": date(2026, 10, 5),
            "urgency": "HIGH",
            "additional_notes": None,
        }
        values.update(overrides)
        return BloodRequestCreate.model_validate(values)


if __name__ == "__main__":
    unittest.main()
