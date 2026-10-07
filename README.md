# Blood Donor Finder

A full-stack application for finding available blood donors and managing blood requests. It combines a React single-page frontend with a FastAPI backend and a SQLite database.

## Problem statement

In an urgent medical situation, patients and families need a straightforward way to find compatible blood donors near a hospital. Blood Donor Finder organizes donor contact profiles and blood requests in one application, with authenticated account and request management.

## Objectives

- Let users create accounts and securely sign in.
- Allow users to register, view, and maintain donor profiles.
- Search donor profiles by blood group, location, PIN code, and availability.
- Create and manage blood requests and find compatible donors.
- Provide account, donor, and request information through authenticated, ownership-scoped workflows.

## Features

- User registration and JWT-based login/logout.
- User profile viewing and editing; email is read-only in the profile workflow.
- Password-reset requests and single-use reset tokens. Email delivery is not configured; a development reset URL can be enabled with `PASSWORD_RESET_DEV_MODE`.
- Donor registration, donor search, donor details, and current-user donor profile management.
- Blood request creation, owner-scoped listing/details/editing, soft cancellation, and status management.
- Blood group compatibility matching that prioritizes same-city and same-state donors and includes only available donors.
- Authenticated dashboard with request totals and donor-registration status.
- Responsive React interface and FastAPI-generated OpenAPI/Swagger documentation.

## User workflows

### User workflow

Register with a name, email, Indian mobile number, and password; log in; then use the dashboard and profile page. The profile page allows editing the name and phone number. Email is displayed read-only. Use Logout to clear the local JWT session.

### Donor workflow

An authenticated user can register as a donor, providing blood group and location/contact information. Donor profiles can be searched and viewed by signed-in users. Donors can manage their own donor details, including availability, from **My Donor Profile**.

### Blood request workflow

An authenticated user can create a request with the blood group, quantity, hospital, location, required date, and urgency. The requester can view, edit, or cancel their own request. Cancellation is a status change, not physical deletion. A pending request can transition to fulfilled or cancelled; terminal requests cannot be transitioned again.

### Matching workflow

The matching endpoint uses blood group compatibility and returns available donor profiles, ordered by location relevance: same city, same state, then other locations.

### Dashboard

The authenticated dashboard shows total, pending, fulfilled, and cancelled request counts and whether the current user has a donor profile. Its request totals are scoped to the signed-in user.

## Technologies

- **Frontend:** React, React Router, Vite, lucide-react, Oxlint
- **Backend:** Python, FastAPI, Pydantic, SQLAlchemy, Uvicorn
- **Database:** SQLite
- **Authentication:** JWT (PyJWT) and bcrypt password hashing

## Project structure

```text
blood_donor_finder/
├── backend/
│   ├── app/
│   │   ├── models/       # SQLAlchemy models
│   │   ├── routers/      # Auth, donor, request, dashboard, profile APIs
│   │   ├── schemas/      # Pydantic validation and response schemas
│   │   ├── utils/        # Password and JWT helpers
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── tests/            # Isolated backend tests
│   ├── requirements.txt
│   └── run.py
├── docs/
│   ├── FINAL_DEMO_GUIDE.md
│   └── SCREENSHOT_CHECKLIST.md
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── context/
    │   └── pages/
    ├── package.json
    └── vite.config.js
```

The SQLite database file is configured by `DATABASE_URL` (by default `backend/blood_donor_finder.db`). Do not delete or reset a database containing project data. On startup, SQLAlchemy creates tables only if absent; the existing location-column compatibility helper adds missing nullable location columns to an existing users table.

## API overview

The backend is served at `http://127.0.0.1:8000` by default.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register an account |
| `POST` | `/api/auth/login` | Authenticate and receive a JWT |
| `POST` | `/api/auth/forgot-password` | Request a password reset |
| `POST` | `/api/auth/reset-password` | Set a password with a valid reset token |
| `GET`, `PUT` | `/api/profile` | Read or update the authenticated user's safe profile fields |
| `GET`, `POST` | `/api/donors` | Search donor profiles or register the authenticated user as a donor |
| `GET`, `PUT` | `/api/donors/me` | Read or update the authenticated user's donor profile |
| `GET` | `/api/donors/{donor_id}` | Read safe donor details |
| `GET` | `/api/dashboard` | Get authenticated user's dashboard counts |
| `GET`, `POST` | `/api/requests` | List or create the authenticated user's requests |
| `GET` | `/api/requests/search` | Search the authenticated user's requests |
| `GET`, `PUT`, `DELETE` | `/api/requests/{request_id}` | Read, edit, or soft-cancel an owned request |
| `GET` | `/api/requests/{request_id}/matches` | Get compatible available donors for an owned request |
| `PATCH` | `/api/requests/{request_id}/status` | Update an owned request's allowed status |
| `GET` | `/api/health` | Check API/database health |

Interactive API documentation is available at `http://127.0.0.1:8000/docs` while the backend is running. Protected endpoints require `Authorization: Bearer <access_token>`. The current user is identified from that token, not a client-supplied user ID.

## Requirements

- Python 3.10 or newer (the project dependencies and source should be used with a supported Python runtime).
- Node.js and npm.
- Windows PowerShell examples below assume the commands are run from the project root.

## Setup and run

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.\venv\Scripts\python.exe run.py
```

If `.env` already exists, keep it and do not overwrite its database or secret settings. The API listens on `http://127.0.0.1:8000`. For a non-development deployment, configure a strong secret key and appropriate database and CORS settings in `.env`; do not use the example secret key.

### Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite serves the application at `http://localhost:5173`. `http://127.0.0.1:5173` is also allowed by the default backend CORS configuration. To use another API URL, set `VITE_API_BASE_URL` for the frontend build/dev process; the default is `http://127.0.0.1:8000`.

## Testing and quality checks

From the backend directory, run the isolated test suite:

```powershell
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

From the frontend directory:

```powershell
npm run build
npm run lint
```

Backend tests use in-memory SQLite databases. They should not use or mutate the project's configured database.

## Security notes

- Passwords are bcrypt-hashed; password hashes are not included in API response schemas.
- Protected operations reuse the JWT authentication dependency and derive user ownership from the token.
- Profile and donor-profile update schemas reject unexpected fields such as client-supplied owner IDs.
- API response schemas expose only fields approved for each response.
- Password-reset tokens are stored as hashes and are single use. Development reset URLs are disabled unless explicitly configured for development.
- CORS allows the two local Vite origins by default and retains additional origins configured through `ALLOWED_ORIGINS`.
- Store `.env` securely, replace the example development secret before deployment, and never commit credentials or production data.

## Future enhancements

- Configure a production email provider for password-reset delivery.
- Add email verification and a secure email-change workflow.
- Add deployment-specific operational monitoring, backups, and rate limiting.
- Expand automated browser-level coverage for the full user and donor workflows.
