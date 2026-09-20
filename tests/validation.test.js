'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDonor, sanitizeString } = require('../lib/validation');

const validPayload = () => ({
  name: 'Asha Rao',
  bloodGroup: 'O+',
  weightKg: 58,
  phone: '+919876543210',
  altPhone: '+919876543299',
  email: 'asha@example.com',
  address: '12th Cross, Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  pinCode: '560038',
  lastDonationDate: '',
  available: true,
});

test('accepts a fully valid donor profile with all SCRUM-14 fields', () => {
  const { valid, errors, value } = validateDonor(validPayload());
  assert.equal(valid, true);
  assert.deepEqual(errors, {});
  assert.equal(value.name, 'Asha Rao');
  assert.equal(value.bloodGroup, 'O+');
  assert.equal(value.weightKg, 58);
  assert.equal(value.phone, '+919876543210');
  assert.equal(value.altPhone, '+919876543299');
  assert.equal(value.city, 'Bengaluru');
  assert.equal(value.state, 'Karnataka');
  assert.equal(value.pinCode, '560038');
  assert.equal(value.eligibleNow, true);
  assert.equal(value.available, true);
});

test('rejects a missing name', () => {
  const payload = validPayload();
  delete payload.name;
  const { valid, errors } = validateDonor(payload);
  assert.equal(valid, false);
  assert.match(errors.name, /required/i);
});

test('rejects a name with digits or illegal characters', () => {
  const payload = { ...validPayload(), name: 'Asha123' };
  const { valid, errors } = validateDonor(payload);
  assert.equal(valid, false);
  assert.ok(errors.name);
});

test('rejects weight below the 50kg donor eligibility standard (SCRUM-17)', () => {
  const payload = { ...validPayload(), weightKg: 48 };
  const { valid, errors } = validateDonor(payload);
  assert.equal(valid, false);
  assert.match(errors.weightKg, /50 kg/);
});

test('rejects an invalid blood group', () => {
  const payload = { ...validPayload(), bloodGroup: 'Z+' };
  const { valid, errors } = validateDonor(payload);
  assert.equal(valid, false);
  assert.ok(errors.bloodGroup);
});

test('rejects missing location fields (address, city, state, pinCode)', () => {
  const payload = validPayload();
  delete payload.address;
  delete payload.city;
  delete payload.state;
  delete payload.pinCode;
  const { valid, errors } = validateDonor(payload);
  assert.equal(valid, false);
  assert.ok(errors.address);
  assert.ok(errors.city);
  assert.ok(errors.state);
  assert.ok(errors.pinCode);
});

test('rejects an invalid pin code format', () => {
  const payload = { ...validPayload(), pinCode: '12' }; // too short
  const { valid, errors } = validateDonor(payload);
  assert.equal(valid, false);
  assert.match(errors.pinCode, /PIN code/);
});

test('rejects a malformed phone number', () => {
  const payload = { ...validPayload(), phone: 'abc-123' };
  const { valid, errors } = validateDonor(payload);
  assert.equal(valid, false);
  assert.ok(errors.phone);
});

test('rejects alternative contact number when identical to primary phone', () => {
  const payload = { ...validPayload(), phone: '+919876543210', altPhone: '+919876543210' };
  const { valid, errors } = validateDonor(payload);
  assert.equal(valid, false);
  assert.match(errors.altPhone, /different/i);
});

test('accepts payload without optional altPhone and email', () => {
  const payload = validPayload();
  delete payload.altPhone;
  delete payload.email;
  const { valid, errors, value } = validateDonor(payload);
  assert.equal(valid, true);
  assert.equal(value.altPhone, '');
  assert.equal(value.email, '');
});

test('rejects a last donation date in the future', () => {
  const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const payload = { ...validPayload(), lastDonationDate: future };
  const { valid, errors } = validateDonor(payload);
  assert.equal(valid, false);
  assert.match(errors.lastDonationDate, /future/);
});

test('rejects last donation under 90 days ago (SCRUM-17 donation interval constraint)', () => {
  const recent = new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString();
  const payload = { ...validPayload(), lastDonationDate: recent };
  const { valid, errors } = validateDonor(payload);
  assert.equal(valid, false);
  assert.match(errors.lastDonationDate, /90 days/);
});

test('accepts last donation date over 90 days ago', () => {
  const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 100).toISOString();
  const payload = { ...validPayload(), lastDonationDate: old };
  const { valid, errors, value } = validateDonor(payload);
  assert.equal(valid, true);
  assert.equal(value.eligibleNow, true);
});

test('sanitizes harmful HTML and script tags from input strings (SCRUM-17 input cleanliness)', () => {
  const rawInput = '<script>alert("hack")</script>Dr. John <b>Doe</b>';
  const sanitized = sanitizeString(rawInput);
  assert.equal(sanitized, 'Dr. John Doe');

  const payload = {
    ...validPayload(),
    name: '<script>evil()</script>Karan Patel',
    address: '<img src=x onerror=alert(1)>221B Baker Street',
  };
  const { valid, value } = validateDonor(payload);
  assert.equal(valid, true);
  assert.equal(value.name, 'Karan Patel');
  assert.equal(value.address, '221B Baker Street');
});
