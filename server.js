'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { validateDonor } = require('./lib/validation');
const { DonorStore } = require('./lib/db');

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DONOR_DB_FILE || path.join(__dirname, 'data', 'donors.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const store = new DonorStore(DB_FILE);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    const MAX_SIZE = 1e6; // 1MB guard against oversized payloads
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_SIZE) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function extractSessionId(req) {
  const tokenHeader = req.headers['x-session-token'];
  if (tokenHeader && String(tokenHeader).trim()) {
    return String(tokenHeader).trim();
  }
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const fullPath = path.join(PUBLIC_DIR, filePath);

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not found');
      }
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Server error');
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

async function handleApi(req, res, pathname, query) {
  const sessionId = extractSessionId(req);

  // --- Session Profile Endpoints ---
  // POST /api/donor/profile or POST /api/donors
  if ((pathname === '/api/donor/profile' || pathname === '/api/donors') && req.method === 'POST') {
    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      return sendJson(res, err.statusCode || 400, { error: err.message });
    }

    const { valid, errors, value } = validateDonor(body);
    if (!valid) {
      return sendJson(res, 422, { error: 'Validation failed', fields: errors });
    }

    const targetSessionId = sessionId || body.sessionId || null;
    const record = await store.create(value, targetSessionId);
    return sendJson(res, 201, {
      message: 'Donor profile created successfully',
      donor: record,
    });
  }

  // GET /api/donor/profile - fetch current user's profile
  if (pathname === '/api/donor/profile' && req.method === 'GET') {
    if (!sessionId) {
      return sendJson(res, 401, { error: 'Session token required' });
    }
    const record = await store.findBySessionId(sessionId);
    if (!record) {
      return sendJson(res, 404, { message: 'No donor profile found for current session' });
    }
    return sendJson(res, 200, { donor: record });
  }

  // PUT or PATCH /api/donor/profile - update current user's profile or toggle availability
  if (pathname === '/api/donor/profile' && (req.method === 'PUT' || req.method === 'PATCH')) {
    if (!sessionId) {
      return sendJson(res, 401, { error: 'Session token required' });
    }
    const existing = await store.findBySessionId(sessionId);
    if (!existing) {
      return sendJson(res, 404, { error: 'Donor profile not found for current session' });
    }

    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      return sendJson(res, err.statusCode || 400, { error: err.message });
    }

    const isPartial = req.method === 'PATCH';
    const { valid, errors, value } = validateDonor(body, isPartial);
    if (!valid) {
      return sendJson(res, 422, { error: 'Validation failed', fields: errors });
    }

    const updated = await store.updateBySessionId(sessionId, value);
    return sendJson(res, 200, {
      message: 'Donor profile updated successfully',
      donor: updated,
    });
  }

  // --- Directory Endpoints ---
  // GET /api/donors - list / search donors
  if (pathname === '/api/donors' && req.method === 'GET') {
    const { bloodGroup, city, state, availableOnly } = query;
    const records = await store.list({
      bloodGroup,
      city,
      state,
      availableOnly: availableOnly === 'true',
    });
    return sendJson(res, 200, { count: records.length, donors: records });
  }

  // GET /api/donors/:id - fetch a single donor by ID
  const singleMatch = pathname.match(/^\/api\/donors\/([^/]+)$/);
  if (singleMatch && req.method === 'GET') {
    const record = await store.findById(singleMatch[1]);
    if (!record) return sendJson(res, 404, { error: 'Donor not found' });
    return sendJson(res, 200, { donor: record });
  }

  // PUT or PATCH /api/donors/:id - update a donor by ID
  if (singleMatch && (req.method === 'PUT' || req.method === 'PATCH')) {
    const existing = await store.findById(singleMatch[1]);
    if (!existing) return sendJson(res, 404, { error: 'Donor not found' });

    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      return sendJson(res, err.statusCode || 400, { error: err.message });
    }

    const isPartial = req.method === 'PATCH';
    const { valid, errors, value } = validateDonor(body, isPartial);
    if (!valid) {
      return sendJson(res, 422, { error: 'Validation failed', fields: errors });
    }

    const updated = await store.update(singleMatch[1], value);
    return sendJson(res, 200, { message: 'Donor updated', donor: updated });
  }

  // DELETE /api/donors/:id - remove a donor profile
  if (singleMatch && req.method === 'DELETE') {
    const deleted = await store.deleteById(singleMatch[1]);
    if (!deleted) return sendJson(res, 404, { error: 'Donor not found' });
    return sendJson(res, 200, { message: 'Donor profile deleted' });
  }

  return sendJson(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsed.pathname);
  const query = Object.fromEntries(parsed.searchParams.entries());

  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname, query);
    } else if (req.method === 'GET') {
      serveStatic(req, res, pathname);
    } else {
      sendJson(res, 405, { error: 'Method not allowed' });
    }
  } catch (err) {
    sendJson(res, 500, { error: 'Internal server error', detail: err.message });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Blood Donor Finder running at http://localhost:${PORT}`);
    console.log(`Donor data stored at ${DB_FILE}`);
  });
}

module.exports = { server, store };
