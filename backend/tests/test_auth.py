import unittest
from urllib.parse import parse_qs, urlsplit

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base
from app.models.password_reset import PasswordResetToken
from app.models.user import User
from app.routers.auth import forgot_password, login_user, register_user, reset_password
from app.schemas.user import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.utils.security import decode_access_token, verify_password


class AuthenticationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.original_environment = settings.ENVIRONMENT
        self.original_password_reset_dev_mode = settings.PASSWORD_RESET_DEV_MODE
        settings.ENVIRONMENT = "development"
        settings.PASSWORD_RESET_DEV_MODE = True
        self.registration = UserCreate(
            full_name="Test User",
            email="test-user@example.com",
            phone="9876543210",
            password="test-password-123",
            confirm_password="test-password-123",
            address="12 Example Street",
            city="Bengaluru",
            state="Karnataka",
            pincode="560001",
        )

    def tearDown(self):
        settings.ENVIRONMENT = self.original_environment
        settings.PASSWORD_RESET_DEV_MODE = self.original_password_reset_dev_mode
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_registration_hashes_password_and_returns_only_safe_fields(self):
        user = register_user(self.registration, self.db)
        response = UserResponse.model_validate(user)

        self.assertEqual(user.email, "test-user@example.com")
        self.assertTrue(verify_password(self.registration.password, user.hashed_password))
        self.assertEqual(self.db.query(User).count(), 1)
        self.assertNotIn("hashed_password", response.model_dump())
        self.assertNotIn("password", response.model_dump())

    def test_registration_rejects_duplicate_email_case_insensitively(self):
        register_user(self.registration, self.db)
        duplicate = self.registration.model_copy(update={"email": "TEST-USER@example.com"})

        with self.assertRaises(HTTPException) as error:
            register_user(duplicate, self.db)

        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(self.db.query(User).count(), 1)

    def test_login_is_case_insensitive_and_returns_a_jwt_without_password_data(self):
        user = register_user(self.registration, self.db)

        result = login_user(UserLogin(email="TEST-USER@example.com", password=self.registration.password), self.db)
        response = Token.model_validate(result)
        payload = decode_access_token(response.access_token)

        self.assertEqual(payload["sub"], str(user.id))
        self.assertEqual(response.user.id, user.id)
        self.assertNotIn("hashed_password", response.user.model_dump())
        self.assertNotIn("password", response.user.model_dump())

    def test_invalid_password_and_unknown_email_are_rejected_equally(self):
        register_user(self.registration, self.db)

        for credentials in (
            UserLogin(email=self.registration.email, password="incorrect-password"),
            UserLogin(email="unknown@example.com", password="incorrect-password"),
        ):
            with self.subTest(email=credentials.email):
                with self.assertRaises(HTTPException) as error:
                    login_user(credentials, self.db)
                self.assertEqual(error.exception.status_code, 401)
                self.assertEqual(error.exception.detail, "Invalid email or password.")

    def test_forgot_and_reset_password_flow_is_single_use_and_stores_token_hash(self):
        user = register_user(self.registration, self.db)

        result = forgot_password(ForgotPasswordRequest(email=user.email), self.db)
        reset_token = parse_qs(urlsplit(result.development_reset_url).query)["token"][0]
        reset_record = self.db.query(PasswordResetToken).filter_by(user_id=user.id).one()
        self.assertNotEqual(reset_record.token_hash, reset_token)

        response = reset_password(
            ResetPasswordRequest(
                token=reset_token,
                new_password="new-test-password-456",
                confirm_password="new-test-password-456",
            ),
            self.db,
        )
        self.assertIn("reset", response.message.lower())
        self.db.refresh(user)
        self.assertTrue(verify_password("new-test-password-456", user.hashed_password))
        self.assertFalse(verify_password(self.registration.password, user.hashed_password))

        with self.assertRaises(HTTPException) as error:
            reset_password(
                ResetPasswordRequest(
                    token=reset_token,
                    new_password="another-password-789",
                    confirm_password="another-password-789",
                ),
                self.db,
            )
        self.assertEqual(error.exception.status_code, 400)

    def test_forgot_password_response_does_not_reveal_unknown_accounts(self):
        register_user(self.registration, self.db)
        known_response = forgot_password(ForgotPasswordRequest(email=self.registration.email), self.db)
        unknown_response = forgot_password(ForgotPasswordRequest(email="unknown@example.com"), self.db)

        self.assertEqual(known_response.message, unknown_response.message)
        self.assertIsNotNone(known_response.development_reset_url)
        self.assertIsNotNone(unknown_response.development_reset_url)
        self.assertEqual(self.db.query(PasswordResetToken).count(), 1)
