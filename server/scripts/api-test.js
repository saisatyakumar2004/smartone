// End-to-end API test. Run with the server already running:  npm test
// Creates two throwaway users, checks the rules, then deletes everything it created.
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const JobApplication = require('../models/JobApplication');

const BASE = `http://localhost:${process.env.PORT || 5000}/api`;
const stamp = Date.now();
const A = { name: 'Test A', email: `a${stamp}@jobtrack-test.dev`, password: 'password123' };
const B = { name: 'Test B', email: `b${stamp}@jobtrack-test.dev`, password: 'password123' };

let passed = 0;
let failed = 0;
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.log(`FAIL  ${name} ${extra}`); }
}

// Tiny client that keeps its own cookie, like a browser would.
function client() {
  let cookie = '';
  return async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    let json = null;
    try { json = await res.json(); } catch { /* no body */ }
    return { status: res.status, json, setCookie: set };
  };
}

async function main() {
  const a = client();
  const b = client();
  const anon = client();
  const job = { company: 'Acme', role: 'Backend Intern', appliedDate: '2026-10-01', status: 'Applied' };

  // --- Registration ---
  let r = await anon('POST', '/auth/register', { ...A, confirmPassword: A.password });
  check('register new user -> 201', r.status === 201);
  check('register response has no password', !JSON.stringify(r.json).includes('password'));
  r = await anon('POST', '/auth/register', { ...A, confirmPassword: A.password });
  check('duplicate email -> 409', r.status === 409);
  r = await anon('POST', '/auth/register', { ...B, email: 'not-an-email', confirmPassword: B.password });
  check('invalid email -> 400', r.status === 400);
  r = await anon('POST', '/auth/register', { ...B, confirmPassword: 'different1' });
  check('password mismatch -> 400', r.status === 400);
  r = await anon('POST', '/auth/register', { ...B, password: 'short', confirmPassword: 'short' });
  check('short password -> 400', r.status === 400);
  r = await anon('POST', '/auth/register', { email: B.email });
  check('missing fields -> 400', r.status === 400);
  r = await anon('POST', '/auth/register', '{bad json');
  check('malformed JSON -> 400', r.status === 400);
  await anon('POST', '/auth/register', { ...B, confirmPassword: B.password });

  // --- Passwords stored as hashes ---
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'jobtrack' });
  const stored = await User.findOne({ email: A.email }).select('+password');
  check('password stored as bcrypt hash', /^\$2[aby]\$/.test(stored.password) && stored.password !== A.password);

  // --- Login ---
  r = await a('POST', '/auth/login', { email: A.email, password: 'wrongpass' });
  check('wrong password -> 401', r.status === 401);
  r = await a('POST', '/auth/login', { email: 'nobody@x.dev', password: 'password123' });
  check('unknown email -> 401', r.status === 401);
  r = await a('POST', '/auth/login', { email: { $ne: '' }, password: { $ne: '' } });
  check('NoSQL-injection style login -> 400', r.status === 400);
  r = await a('POST', '/auth/login', { email: A.email, password: A.password });
  check('valid login -> 200', r.status === 200);
  check('login sets HttpOnly cookie', /token=/.test(r.setCookie || '') && /HttpOnly/i.test(r.setCookie || ''));
  check('login response has no password/hash', !/password|\$2[aby]\$/.test(JSON.stringify(r.json)));
  await b('POST', '/auth/login', { email: B.email, password: B.password });

  // --- Protected routes ---
  r = await anon('GET', '/applications');
  check('no cookie: GET /applications -> 401', r.status === 401);
  r = await anon('POST', '/applications', job);
  check('no cookie: POST /applications -> 401', r.status === 401);
  r = await anon('GET', '/auth/me');
  check('no cookie: GET /auth/me -> 401', r.status === 401);
  r = await a('GET', '/auth/me');
  check('with cookie: GET /auth/me -> 200 with name', r.status === 200 && r.json.user.name === A.name);

  // --- CRUD ---
  r = await a('POST', '/applications', { ...job, company: '' });
  check('create without company -> 400', r.status === 400);
  r = await a('POST', '/applications', { ...job, status: 'Bogus' });
  check('create with bad status -> 400', r.status === 400);
  r = await a('POST', '/applications', { ...job, jobUrl: 'javascript:alert(1)' });
  check('create with non-http URL -> 400', r.status === 400);
  r = await a('POST', '/applications', job);
  check('create application -> 201', r.status === 201 && r.json.application.company === 'Acme');
  const id = r.json.application._id;
  await a('POST', '/applications', { ...job, company: 'Globex', role: 'Frontend Dev', status: 'Interview' });

  r = await a('GET', '/applications');
  check('list returns 2 + stats', r.status === 200 && r.json.applications.length === 2 && r.json.stats.total === 2
    && r.json.stats.byStatus.Applied === 1 && r.json.stats.byStatus.Interview === 1);
  r = await a('GET', '/applications?search=glob');
  check('search by company', r.json.applications.length === 1 && r.json.applications[0].company === 'Globex');
  r = await a('GET', '/applications?search=backend');
  check('search by role', r.json.applications.length === 1 && r.json.applications[0].company === 'Acme');
  r = await a('GET', '/applications?search=.*');
  check('regex chars in search are escaped', r.status === 200 && r.json.applications.length === 0);
  r = await a('GET', '/applications?status=Interview');
  check('filter by status', r.json.applications.length === 1 && r.json.applications[0].status === 'Interview');
  r = await a('GET', '/applications?status=Nope');
  check('invalid status filter -> 400', r.status === 400);
  r = await a('GET', `/applications/${id}`);
  check('get one -> 200', r.status === 200 && r.json.application._id === id);
  r = await a('GET', '/applications/123');
  check('invalid id -> 400', r.status === 400);
  r = await a('GET', '/applications/507f1f77bcf86cd799439011');
  check('unknown id -> 404', r.status === 404);
  r = await a('PUT', `/applications/${id}`, { ...job, status: 'Offer', notes: 'Great call' });
  check('update -> 200 and persisted', r.status === 200 && r.json.application.status === 'Offer' && r.json.application.notes === 'Great call');

  // --- Ownership ---
  r = await b('GET', '/applications');
  check("user B list does not see A's data", r.status === 200 && r.json.applications.length === 0 && r.json.stats.total === 0);
  r = await b('GET', `/applications/${id}`);
  check("user B cannot read A's application -> 404", r.status === 404);
  r = await b('PUT', `/applications/${id}`, { ...job, company: 'Hacked' });
  check("user B cannot update A's application -> 404", r.status === 404);
  r = await b('DELETE', `/applications/${id}`);
  check("user B cannot delete A's application -> 404", r.status === 404);
  r = await a('GET', `/applications/${id}`);
  check('A record unchanged after B attempts', r.status === 200 && r.json.application.company === 'Acme');

  // --- Persistence in MongoDB ---
  const inDb = await JobApplication.findById(id);
  check('record exists in MongoDB', !!inDb && inDb.status === 'Offer');

  // --- Delete + logout ---
  r = await a('DELETE', `/applications/${id}`);
  check('owner delete -> 200', r.status === 200);
  r = await a('GET', `/applications/${id}`);
  check('deleted record -> 404', r.status === 404);
  r = await a('POST', '/auth/logout');
  check('logout -> 200 and clears cookie', r.status === 200 && /token=;/.test(r.setCookie || ''));
  r = await a('GET', '/auth/me');
  check('after logout /auth/me -> 401', r.status === 401);
  r = await anon('GET', '/nothing');
  check('unknown API route -> 404 JSON', r.status === 404 && !!r.json);

  // --- Cleanup ---
  const users = await User.find({ email: { $in: [A.email, B.email] } });
  const ids = users.map((u) => u._id);
  await JobApplication.deleteMany({ user: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });
  await mongoose.disconnect();

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('Test run crashed:', e.message); process.exit(1); });
