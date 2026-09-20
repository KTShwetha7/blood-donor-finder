# Pulse — Blood Donor Finder

A small full-stack app for registering blood donors and searching the registry
by blood group and city. Zero external dependencies — runs on plain Node.js.

## Structure

```
blood-donor-app/
├── server.js              # HTTP backend (routes, static file serving)
├── lib/
│   ├── validation.js       # Donor field validation rules
│   └── db.js                # JSON-file-backed donor "database"
├── public/
│   ├── index.html           # Donor profile form + search directory
│   ├── style.css
│   └── app.js                # Frontend logic (fetch calls, rendering)
├── data/
│   └── donors.json          # Data store (created automatically)
├── tests/
│   ├── validation.test.js   # Unit tests for validation rules
│   └── api.test.js          # Integration tests against a live server
└── package.json
```

## Run it

Requires Node.js 18+ (built-in `fetch` and test runner). No `npm install` needed.

```bash
npm start
# or: node server.js
```

Then open http://localhost:3000. Set `PORT` to change the port and
`DONOR_DB_FILE` to change where data is stored.

## Run the tests

```bash
npm test
# or: node --test tests/*.test.js
```

23 tests cover:
- **Validation** — required fields, age range (18–65), minimum weight (45 kg),
  phone/email format, blood group whitelist, future-dated donations, and the
  90-day gap rule between donations.
- **API** — creating a profile (201), rejecting invalid data (422) and bad
  JSON (400), listing, filtering by blood group/city, fetching by id (404 for
  unknown ids), and deleting a profile — all run against the real HTTP server
  with a disposable temp database.

## API reference

| Method | Path              | Description                          |
|--------|-------------------|---------------------------------------|
| POST   | `/api/donors`     | Create a donor profile                |
| GET    | `/api/donors`     | List donors (`?bloodGroup=&city=&availableOnly=true`) |
| GET    | `/api/donors/:id` | Fetch a single donor                  |
| DELETE | `/api/donors/:id` | Remove a donor profile                |

### Donor fields

| Field              | Required | Rule                                              |
|--------------------|----------|----------------------------------------------------|
| `name`             | yes      | 2–60 letters, spaces, apostrophes, hyphens          |
| `age`              | yes      | whole number, 18–65                                 |
| `gender`           | yes      | `female` \| `male` \| `other`                       |
| `bloodGroup`       | yes      | one of A+, A-, B+, B-, AB+, AB-, O+, O-             |
| `weightKg`         | yes      | number ≥ 45                                         |
| `phone`            | yes      | 7–15 digits, optional leading `+`                   |
| `email`            | no       | valid email format if provided                      |
| `city`             | yes      | 2–80 characters                                     |
| `lastDonationDate` | no       | not in the future; sets `eligibleNow` (90-day gap)  |
| `available`        | no       | boolean, defaults to false                          |

## Notes on the data layer

`lib/db.js` wraps a JSON file behind an async, DB-like interface
(`create`, `list`, `findById`, `deleteById`). Swapping in a real database
later (SQLite, Postgres, etc.) means reimplementing that one file — routes
and validation don't need to change.
