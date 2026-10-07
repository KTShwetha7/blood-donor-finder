const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'users.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      contactNumber TEXT NOT NULL,
      bloodGroup TEXT NOT NULL,
      city TEXT NOT NULL,
      weightKg REAL NOT NULL,
      lastDonationDate TEXT,
      weightConfirmed INTEGER NOT NULL DEFAULT 0,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `, (createErr) => {
    if (createErr) {
      console.error('Failed to create users table:', createErr.message);
      process.exit(1);
    }
  });
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.redirect('/user-registration.html');
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistration(body) {
  const {
    fullName,
    email,
    contactNumber,
    bloodGroup,
    city,
    password,
    weightKg,
    lastDonationDate,
    weightConfirmed,
  } = body;

  const errors = {};

  if (!fullName || !String(fullName).trim()) errors.fullName = 'Full name is required.';
  if (!email || !emailRegex.test(String(email).trim())) errors.email = 'Enter a valid email address.';
  if (!contactNumber || !/^\d{10,15}$/.test(String(contactNumber).replace(/\s+/g, ''))) {
    errors.contactNumber = 'Contact number must contain 10 to 15 digits.';
  }
  if (!bloodGroup || !['A+','A-','B+','B-','AB+','AB-','O+','O-'].includes(bloodGroup)) {
    errors.bloodGroup = 'Select a valid blood group.';
  }
  if (!city || !String(city).trim()) errors.city = 'City is required.';
  if (!password || String(password).length < 8 || !/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    errors.password = 'Password must be at least 8 characters and include a number or symbol.';
  }
  if (weightKg === undefined || weightKg === null || Number(weightKg) < 50) {
    errors.weightKg = 'Weight must be at least 50 kg.';
  }
  if (weightConfirmed !== true && weightConfirmed !== 'true') {
    errors.weightConfirmed = 'You must confirm your weight is 50kg or above.';
  }
  if (!lastDonationDate) {
    errors.lastDonationDate = 'Last donation date is required.';
  }

  return errors;
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Registration API is running.' });
});

app.post('/api/register', async (req, res) => {
  const body = req.body || {};
  const errors = validateRegistration(body);

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed.', errors });
  }

  const email = String(body.email).trim().toLowerCase();
  const fullName = String(body.fullName).trim();
  const contactNumber = String(body.contactNumber).replace(/\s+/g, '');
  const city = String(body.city).trim();
  const bloodGroup = String(body.bloodGroup).trim();
  const weightKg = Number(body.weightKg);
  const lastDonationDate = String(body.lastDonationDate).trim();
  const passwordHash = await bcrypt.hash(String(body.password), 10);

  db.get('SELECT id FROM users WHERE email = ?', [email], (findErr, existingUser) => {
    if (findErr) {
      return res.status(500).json({ success: false, message: 'Database lookup failed.' });
    }
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'This email is already registered.' });
    }

    db.run(
      `INSERT INTO users (fullName, email, contactNumber, bloodGroup, city, weightKg, lastDonationDate, weightConfirmed, passwordHash, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [fullName, email, contactNumber, bloodGroup, city, weightKg, lastDonationDate, 1, passwordHash],
      (insertErr) => {
        if (insertErr) {
          console.error('Insert failed:', insertErr.message);
          return res.status(500).json({ success: false, message: 'Registration failed while saving to database.' });
        }

        return res.status(201).json({
          success: true,
          message: 'Registration successful.',
          redirectUrl: '/login.html'
        });
      }
    );
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
