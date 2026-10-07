import asyncio
import json
import unittest
from types import SimpleNamespace
from urllib.parse import urlsplit

from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.user import User
from app.routers.profile import router as profile_router
from app.utils.security import create_access_token


class ProfileEndpointTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.owner = User(
            full_name="Profile Owner",
            email="profile-owner@example.com",
            hashed_password="owner-hash",
            phone="9876543210",
        )
        self.other_user = User(
            full_name="Other Profile",
            email="other-profile@example.com",
            hashed_password="other-hash",
            phone="9876543211",
        )
        self.db.add_all([self.owner, self.other_user])
        self.db.commit()

        app = FastAPI()
        app.include_router(profile_router)

        def override_get_db():
            yield self.db

        app.dependency_overrides[get_db] = override_get_db
        self.app = app

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    @staticmethod
    def _auth_headers(user):
        token = create_access_token({"sub": str(user.id)})
        return {"Authorization": f"Bearer {token}"}

    def _request(self, method, path, user=None, payload=None):
        parsed_path = urlsplit(path)
        headers = [(b"host", b"testserver")]
        if payload is not None:
            headers.append((b"content-type", b"application/json"))
        if user is not None:
            headers.append((b"authorization", self._auth_headers(user)["Authorization"].encode()))
        body = json.dumps(payload).encode() if payload is not None else b""
        messages = []
        has_received_request = False

        async def receive():
            nonlocal has_received_request
            if has_received_request:
                return {"type": "http.disconnect"}
            has_received_request = True
            return {"type": "http.request", "body": body, "more_body": False}

        async def send(message):
            messages.append(message)

        scope = {
            "type": "http",
            "asgi": {"version": "3.0", "spec_version": "2.3"},
            "http_version": "1.1",
            "method": method,
            "scheme": "http",
            "path": parsed_path.path,
            "raw_path": parsed_path.path.encode(),
            "query_string": parsed_path.query.encode(),
            "root_path": "",
            "headers": headers,
            "server": ("testserver", 80),
            "client": ("testclient", 12345),
        }
        asyncio.run(self.app(scope, receive, send))
        response_status = next(message["status"] for message in messages if message["type"] == "http.response.start")
        response_body = b"".join(
            message.get("body", b"")
            for message in messages
            if message["type"] == "http.response.body"
        )
        return SimpleNamespace(
            status_code=response_status,
            json=lambda: json.loads(response_body) if response_body else None,
        )

    def test_authenticated_get_returns_only_safe_current_user_fields(self):
        response = self._request("GET", "/api/profile", user=self.owner)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "id": self.owner.id,
                "full_name": "Profile Owner",
                "email": "profile-owner@example.com",
                "phone": "9876543210",
            },
        )
        self.assertNotIn("password", response.json())
        self.assertNotIn("hashed_password", response.json())
        self.assertNotIn("password_hash", response.json())

    def test_unauthenticated_get_returns_401(self):
        response = self._request("GET", "/api/profile")

        self.assertEqual(response.status_code, 401)

    def test_jwt_identity_selects_profile_and_client_user_id_is_not_used(self):
        owner_response = self._request(
            "GET",
            f"/api/profile?user_id={self.other_user.id}",
            user=self.owner,
        )
        other_response = self._request("GET", "/api/profile", user=self.other_user)

        self.assertEqual(owner_response.status_code, 200)
        self.assertEqual(owner_response.json()["id"], self.owner.id)
        self.assertEqual(owner_response.json()["email"], self.owner.email)
        self.assertEqual(other_response.status_code, 200)
        self.assertEqual(other_response.json()["id"], self.other_user.id)

    def test_authenticated_put_updates_only_name_and_phone(self):
        original_email = self.owner.email
        original_password_hash = self.owner.hashed_password

        response = self._request(
            "PUT",
            "/api/profile",
            user=self.owner,
            payload={"full_name": "Updated Profile Owner", "phone": "9123456789"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["full_name"], "Updated Profile Owner")
        self.assertEqual(response.json()["phone"], "9123456789")
        self.assertEqual(response.json()["email"], original_email)
        self.assertEqual(set(response.json()), {"id", "full_name", "email", "phone"})
        self.assertNotIn("hashed_password", response.json())
        self.assertEqual(self.db.query(User).filter(User.id == self.owner.id).count(), 1)
        self.assertEqual(self.db.query(User).count(), 2)
        self.db.refresh(self.owner)
        self.assertEqual(self.owner.email, original_email)
        self.assertEqual(self.owner.hashed_password, original_password_hash)

    def test_unauthenticated_put_returns_401(self):
        response = self._request(
            "PUT",
            "/api/profile",
            payload={"full_name": "Updated Name", "phone": "9123456789"},
        )

        self.assertEqual(response.status_code, 401)

    def test_put_rejects_unexpected_identity_and_sensitive_fields(self):
        payload = {"full_name": "Updated Name", "phone": "9123456789"}
        for field in (
            "user_id",
            "requester_id",
            "password",
            "password_hash",
            "hashed_password",
            "role",
            "email",
        ):
            with self.subTest(field=field):
                response = self._request(
                    "PUT",
                    "/api/profile",
                    user=self.owner,
                    payload={**payload, field: "attacker-controlled"},
                )
                self.assertEqual(response.status_code, 422)

        self.db.refresh(self.owner)
        self.assertEqual(self.owner.full_name, "Profile Owner")
        self.assertEqual(self.db.query(User).count(), 2)

    def test_put_validates_name_and_phone_using_registration_conventions(self):
        for payload in (
            {"full_name": " ", "phone": "9123456789"},
            {"full_name": "Valid Name", "phone": "123"},
        ):
            with self.subTest(payload=payload):
                response = self._request(
                    "PUT",
                    "/api/profile",
                    user=self.owner,
                    payload=payload,
                )
                self.assertEqual(response.status_code, 422)
