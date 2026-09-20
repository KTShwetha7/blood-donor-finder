'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'donor-db-')), 'donors.json');
process.env.DONOR_DB_FILE = tmpDbFile;
process.env.PORT = 0; // OS free port

const { server } = require('../server');

let baseUrl;

test.before(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(path.dirname(tmpDbFile), { recursive: true, force: true });
});

const sampleDonor = (overrides = {}) => ({
  name: 'Ravi Kumar',
  bloodGroup: 'B+',
  weightKg: 70,
  phone: '9988776655',
  altPhone: '9988776644',
  email: 'ravi@example.com',
  address: '100 Feet Road, 4th Block',
  city: 'Bengaluru',
  state: 'Karnataka',
  pinCode: '560034',
  available: true,
  ...overrides,
});

test('POST /api/donor/profile creates profile with session association and returns 201 (SCRUM-15)', async () => {
  const res = await fetch(`${baseUrl}/api/donor/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': 'session-user-123',
    },
    body: JSON.stringify(sampleDonor()),
  });
  const data = await res.json();

  assert.equal(res.status, 201);
  assert.ok(data.donor.id);
  assert.equal(data.donor.sessionId, 'session-user-123');
  assert.equal(data.donor.name, 'Ravi Kumar');
  assert.equal(data.donor.bloodGroup, 'B+');
  assert.equal(data.donor.weightKg, 70);
  assert.equal(data.donor.city, 'Bengaluru');
});

test('GET /api/donor/profile retrieves profile linked to current session (SCRUM-15)', async () => {
  const res = await fetch(`${baseUrl}/api/donor/profile`, {
    headers: { 'X-Session-Token': 'session-user-123' },
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.donor.name, 'Ravi Kumar');
  assert.equal(data.donor.sessionId, 'session-user-123');
});

test('GET /api/donor/profile returns 404 for unknown session', async () => {
  const res = await fetch(`${baseUrl}/api/donor/profile`, {
    headers: { 'X-Session-Token': 'non-existent-session' },
  });
  assert.equal(res.status, 404);
});

test('PUT /api/donor/profile updates existing profile (SCRUM-16)', async () => {
  const res = await fetch(`${baseUrl}/api/donor/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': 'session-user-123',
    },
    body: JSON.stringify(sampleDonor({ city: 'Mysuru', weightKg: 72 })),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.donor.city, 'Mysuru');
  assert.equal(data.donor.weightKg, 72);
});

test('PATCH /api/donor/profile updates availability toggle (SCRUM-16)', async () => {
  const res = await fetch(`${baseUrl}/api/donor/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': 'session-user-123',
    },
    body: JSON.stringify({ available: false }),
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.donor.available, false);
});

test('POST /api/donor/profile blocks underweight (< 50kg) donors with 422 (SCRUM-17 / SCRUM-18)', async () => {
  const res = await fetch(`${baseUrl}/api/donor/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': 'session-underweight',
    },
    body: JSON.stringify(sampleDonor({ weightKg: 46 })),
  });
  const data = await res.json();

  assert.equal(res.status, 422);
  assert.ok(data.fields.weightKg);
  assert.match(data.fields.weightKg, /50 kg/);
});

test('POST /api/donor/profile blocks recent donation dates (< 90 days) with 422 (SCRUM-17 / SCRUM-18)', async () => {
  const recentDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
  const res = await fetch(`${baseUrl}/api/donor/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': 'session-recent-donation',
    },
    body: JSON.stringify(sampleDonor({ lastDonationDate: recentDate })),
  });
  const data = await res.json();

  assert.equal(res.status, 422);
  assert.ok(data.fields.lastDonationDate);
  assert.match(data.fields.lastDonationDate, /90 days/);
});

test('POST /api/donor/profile rejects missing required fields (SCRUM-17)', async () => {
  const res = await fetch(`${baseUrl}/api/donor/profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json();

  assert.equal(res.status, 422);
  assert.ok(data.fields.name);
  assert.ok(data.fields.bloodGroup);
  assert.ok(data.fields.weightKg);
  assert.ok(data.fields.phone);
  assert.ok(data.fields.address);
  assert.ok(data.fields.city);
  assert.ok(data.fields.state);
  assert.ok(data.fields.pinCode);
});

test('GET /api/donors lists donors and filters by bloodGroup and city (SCRUM-18 database audit)', async () => {
  await fetch(`${baseUrl}/api/donors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sampleDonor({ name: 'Meena Iyer', bloodGroup: 'O-', city: 'Chennai', state: 'Tamil Nadu' })),
  });

  const res = await fetch(`${baseUrl}/api/donors?bloodGroup=O-&city=chennai`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.count, 1);
  assert.equal(data.donors[0].name, 'Meena Iyer');
  assert.equal(data.donors[0].bloodGroup, 'O-');
  assert.equal(data.donors[0].city, 'Chennai');
});

test('GET /api/donors/:id and DELETE /api/donors/:id work as expected', async () => {
  const createRes = await fetch(`${baseUrl}/api/donors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sampleDonor({ name: 'Temp Donor' })),
  });
  const created = await createRes.json();

  const getRes = await fetch(`${baseUrl}/api/donors/${created.donor.id}`);
  assert.equal(getRes.status, 200);

  const delRes = await fetch(`${baseUrl}/api/donors/${created.donor.id}`, { method: 'DELETE' });
  assert.equal(delRes.status, 200);

  const afterDel = await fetch(`${baseUrl}/api/donors/${created.donor.id}`);
  assert.equal(afterDel.status, 404);
});
