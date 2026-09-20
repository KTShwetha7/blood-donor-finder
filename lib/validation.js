'use strict';

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_GENDERS = ['male', 'female', 'other'];

const NAME_RE = /^[A-Za-z][A-Za-z .'-]{1,59}$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_CODE_RE = /^[0-9A-Za-z\s-]{4,10}$/;

const MIN_AGE = 18;
const MAX_AGE = 65;
const MIN_WEIGHT_KG = 50; // Core donor eligibility standard: weight at least 50kg
const MIN_DAYS_BETWEEN_DONATIONS = 90; // Mandatory waiting period: 90 days

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === '';
}

/**
 * Strips script tags, HTML tags, and structural injection characters
 * to ensure input cleanliness and safety.
 */
function sanitizeString(str) {
  if (isBlank(str)) return '';
  return String(str)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // remove <script>...</script>
    .replace(/<[^>]+>/g, '') // remove other HTML tags
    .replace(/[<>'"`;]/g, (match) => {
      switch (match) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        case '`': return '&#96;';
        default: return '';
      }
    })
    .trim();
}

function normalizeTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function daysBetween(dateA, dateB) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((dateA.getTime() - dateB.getTime()) / msPerDay);
}

/**
 * Validate and sanitize donor profile payload.
 * @param {object} data
 * @param {boolean} isPartial - If true (e.g. PATCH), only present fields are validated
 * @returns {{valid: boolean, errors: Object<string,string>, value: object}}
 */
function validateDonor(data = {}, isPartial = false) {
  const errors = {};
  const value = {};

  // --- name ---
  if (!isPartial || 'name' in data) {
    const rawName = isBlank(data.name) ? '' : String(data.name).trim();
    const cleanName = sanitizeString(rawName);
    if (isBlank(cleanName)) {
      errors.name = 'Full name is required.';
    } else if (!NAME_RE.test(cleanName)) {
      errors.name = 'Name must be 2-60 letters and may include spaces, apostrophes, or hyphens.';
    } else {
      value.name = cleanName;
    }
  }

  // --- age (optional / default eligible) ---
  if ('age' in data && !isBlank(data.age)) {
    const age = Number(data.age);
    if (!Number.isInteger(age)) {
      errors.age = 'Age must be a whole number.';
    } else if (age < MIN_AGE || age > MAX_AGE) {
      errors.age = `Donors must be between ${MIN_AGE} and ${MAX_AGE} years old.`;
    } else {
      value.age = age;
    }
  } else if (!isPartial && 'age' in data) {
    // If age was explicitly passed but blank
    value.age = null;
  }

  // --- gender (optional) ---
  if ('gender' in data && !isBlank(data.gender)) {
    const gender = String(data.gender).toLowerCase().trim();
    if (!VALID_GENDERS.includes(gender)) {
      errors.gender = `Gender must be one of: ${VALID_GENDERS.join(', ')}.`;
    } else {
      value.gender = gender;
    }
  }

  // --- blood group ---
  if (!isPartial || 'bloodGroup' in data) {
    const bloodGroup = isBlank(data.bloodGroup) ? '' : String(data.bloodGroup).toUpperCase().trim();
    if (isBlank(bloodGroup)) {
      errors.bloodGroup = 'Blood group is required.';
    } else if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      errors.bloodGroup = `Blood group must be one of: ${VALID_BLOOD_GROUPS.join(', ')}.`;
    } else {
      value.bloodGroup = bloodGroup;
    }
  }

  // --- weight (weightKg) ---
  if (!isPartial || 'weightKg' in data) {
    if (isBlank(data.weightKg)) {
      errors.weightKg = 'Weight is required.';
    } else {
      const weight = Number(data.weightKg);
      if (Number.isNaN(weight)) {
        errors.weightKg = 'Weight must be a valid number.';
      } else if (weight < MIN_WEIGHT_KG) {
        errors.weightKg = `Donors must weigh at least ${MIN_WEIGHT_KG} kg to be eligible.`;
      } else if (weight > 300) {
        errors.weightKg = 'Weight seems out of range, please verify.';
      } else {
        value.weightKg = Math.round(weight * 10) / 10;
      }
    }
  }

  // --- contact number (phone) ---
  if (!isPartial || 'phone' in data || 'contactNumber' in data) {
    const rawPhone = isBlank(data.phone) ? (isBlank(data.contactNumber) ? '' : String(data.contactNumber)) : String(data.phone);
    const cleanPhone = rawPhone.replace(/[\s()-]/g, '').trim();
    if (isBlank(cleanPhone)) {
      errors.phone = 'Contact number is required.';
    } else if (!PHONE_RE.test(cleanPhone)) {
      errors.phone = 'Enter a valid contact number (7-15 digits, optional leading +).';
    } else {
      value.phone = cleanPhone;
    }
  }

  // --- alternative contact number (altPhone) ---
  const rawAltPhone = !isBlank(data.altPhone) ? String(data.altPhone) : (!isBlank(data.alternativeContactNumber) ? String(data.alternativeContactNumber) : '');
  if (!isBlank(rawAltPhone)) {
    const cleanAltPhone = rawAltPhone.replace(/[\s()-]/g, '').trim();
    if (!PHONE_RE.test(cleanAltPhone)) {
      errors.altPhone = 'Enter a valid alternative contact number (7-15 digits).';
    } else if (value.phone && cleanAltPhone === value.phone) {
      errors.altPhone = 'Alternative contact number must be different from primary contact number.';
    } else {
      value.altPhone = cleanAltPhone;
    }
  } else {
    value.altPhone = '';
  }

  // --- email (optional) ---
  if ('email' in data && !isBlank(data.email)) {
    const cleanEmail = sanitizeString(data.email);
    if (!EMAIL_RE.test(cleanEmail)) {
      errors.email = 'Enter a valid email address.';
    } else {
      value.email = cleanEmail.toLowerCase();
    }
  } else if (!isPartial) {
    value.email = '';
  }

  // --- address ---
  if (!isPartial || 'address' in data) {
    const cleanAddress = sanitizeString(data.address);
    if (isBlank(cleanAddress)) {
      errors.address = 'Address is required.';
    } else if (cleanAddress.length < 5 || cleanAddress.length > 150) {
      errors.address = 'Address must be between 5 and 150 characters.';
    } else {
      value.address = cleanAddress;
    }
  }

  // --- city ---
  if (!isPartial || 'city' in data) {
    const cleanCity = sanitizeString(data.city);
    if (isBlank(cleanCity)) {
      errors.city = 'City is required.';
    } else if (cleanCity.length < 2 || cleanCity.length > 80) {
      errors.city = 'City must be between 2 and 80 characters.';
    } else {
      value.city = normalizeTitleCase(cleanCity);
    }
  }

  // --- state ---
  if (!isPartial || 'state' in data) {
    const cleanState = sanitizeString(data.state);
    if (isBlank(cleanState)) {
      errors.state = 'State is required.';
    } else if (cleanState.length < 2 || cleanState.length > 80) {
      errors.state = 'State must be between 2 and 80 characters.';
    } else {
      value.state = normalizeTitleCase(cleanState);
    }
  }

  // --- pin code ---
  if (!isPartial || 'pinCode' in data) {
    const cleanPin = sanitizeString(data.pinCode).replace(/\s+/g, '');
    if (isBlank(cleanPin)) {
      errors.pinCode = 'Pin code is required.';
    } else if (!PIN_CODE_RE.test(cleanPin)) {
      errors.pinCode = 'Enter a valid postal / PIN code (4-10 characters).';
    } else {
      value.pinCode = cleanPin.toUpperCase();
    }
  }

  // --- last donation date (optional, but if provided, must be >= 90 days ago) ---
  if ('lastDonationDate' in data && !isBlank(data.lastDonationDate)) {
    const d = new Date(data.lastDonationDate);
    const now = new Date();
    if (Number.isNaN(d.getTime())) {
      errors.lastDonationDate = 'Enter a valid date.';
    } else if (d.getTime() > now.getTime()) {
      errors.lastDonationDate = 'Last donation date cannot be in the future.';
    } else {
      const gap = daysBetween(now, d);
      if (gap < MIN_DAYS_BETWEEN_DONATIONS) {
        errors.lastDonationDate = `Last donation was ${gap} day(s) ago. Mandatory waiting period is at least ${MIN_DAYS_BETWEEN_DONATIONS} days.`;
      } else {
        value.lastDonationDate = d.toISOString().slice(0, 10);
        value.eligibleNow = true;
      }
    }
  } else if (!isPartial) {
    value.lastDonationDate = '';
    value.eligibleNow = true;
  }

  // --- availability toggle ---
  if ('available' in data) {
    value.available = data.available === true || data.available === 'true' || data.available === 'on' || data.available === 1;
  } else if (!isPartial) {
    value.available = true;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value,
  };
}

module.exports = {
  validateDonor,
  sanitizeString,
  normalizeTitleCase,
  VALID_BLOOD_GROUPS,
  VALID_GENDERS,
  MIN_AGE,
  MAX_AGE,
  MIN_WEIGHT_KG,
  MIN_DAYS_BETWEEN_DONATIONS,
};
