'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * JSON-file-backed database for donor records.
 * Keeps a serialized write queue to prevent concurrent write collisions.
 */
class DonorStore {
  constructor(filePath) {
    this.filePath = filePath;
    this._writeLock = Promise.resolve();
    this._ensureFile();
  }

  _ensureFile() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '[]', 'utf8');
    }
  }

  _readAll() {
    const raw = fs.readFileSync(this.filePath, 'utf8').trim();
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new Error(`Donor database file is corrupted: ${err.message}`);
    }
  }

  _writeAll(records) {
    this._writeLock = this._writeLock.then(() =>
      fs.promises.writeFile(this.filePath, JSON.stringify(records, null, 2), 'utf8')
    );
    return this._writeLock;
  }

  async create(donor, sessionId = null) {
    const records = this._readAll();
    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      sessionId: sessionId || crypto.randomUUID(),
      name: donor.name,
      phone: donor.phone,
      altPhone: donor.altPhone || '',
      bloodGroup: donor.bloodGroup,
      weightKg: donor.weightKg,
      age: donor.age || null,
      gender: donor.gender || '',
      email: donor.email || '',
      address: donor.address || '',
      city: donor.city,
      state: donor.state || '',
      pinCode: donor.pinCode || '',
      lastDonationDate: donor.lastDonationDate || '',
      available: donor.available !== false,
      eligibleNow: donor.eligibleNow !== false,
      createdAt: now,
      updatedAt: now,
    };

    // If a record with this sessionId already exists, replace it, otherwise push new
    const existingIndex = record.sessionId ? records.findIndex((r) => r.sessionId === record.sessionId) : -1;
    if (existingIndex !== -1) {
      records[existingIndex] = { ...records[existingIndex], ...record, id: records[existingIndex].id };
      await this._writeAll(records);
      return records[existingIndex];
    }

    records.push(record);
    await this._writeAll(records);
    return record;
  }

  async findBySessionId(sessionId) {
    if (!sessionId) return null;
    const records = this._readAll();
    return records.find((r) => r.sessionId === sessionId) || null;
  }

  async findById(id) {
    if (!id) return null;
    const records = this._readAll();
    return records.find((r) => r.id === id) || null;
  }

  async update(id, updates) {
    const records = this._readAll();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    const updated = {
      ...records[idx],
      ...updates,
      id: records[idx].id, // preserve id
      sessionId: records[idx].sessionId, // preserve session
      updatedAt: new Date().toISOString(),
    };
    records[idx] = updated;
    await this._writeAll(records);
    return updated;
  }

  async updateBySessionId(sessionId, updates) {
    if (!sessionId) return null;
    const records = this._readAll();
    const idx = records.findIndex((r) => r.sessionId === sessionId);
    if (idx === -1) return null;

    const updated = {
      ...records[idx],
      ...updates,
      id: records[idx].id,
      sessionId: records[idx].sessionId,
      updatedAt: new Date().toISOString(),
    };
    records[idx] = updated;
    await this._writeAll(records);
    return updated;
  }

  async list({ bloodGroup, city, state, availableOnly } = {}) {
    let records = this._readAll();
    if (bloodGroup) {
      const bg = String(bloodGroup).toUpperCase();
      records = records.filter((r) => r.bloodGroup === bg);
    }
    if (city) {
      const c = String(city).toLowerCase();
      records = records.filter((r) => r.city && r.city.toLowerCase().includes(c));
    }
    if (state) {
      const s = String(state).toLowerCase();
      records = records.filter((r) => r.state && r.state.toLowerCase().includes(s));
    }
    if (availableOnly) {
      records = records.filter((r) => r.available && r.eligibleNow);
    }
    return records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async deleteById(id) {
    const records = this._readAll();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    records.splice(idx, 1);
    await this._writeAll(records);
    return true;
  }

  async count() {
    return this._readAll().length;
  }
}

module.exports = { DonorStore };
