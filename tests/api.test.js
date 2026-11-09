import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server/app.js';

let server;
let origin;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('health endpoint responds without database or sign-in', async () => {
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', app: 'Saarthi' });
});

test('accounts-only endpoints reject requests without a token', async () => {
  const response = await fetch(`${origin}/api/dashboard`);
  assert.equal(response.status, 401);
  assert.match((await response.json()).error, /sign in/i);
});

test('payment writes cannot be called without authentication', async () => {
  const response = await fetch(`${origin}/api/payments/mock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: 'STU-0412', installmentId: '507f1f77bcf86cd799439011' }),
  });
  assert.equal(response.status, 401);
});

test('parent OTP consent and phone inputs are validated before lookup', async () => {
  const response = await fetch(`${origin}/api/auth/parent/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '123', language: 'en', consentConfirmed: false }),
  });
  assert.equal(response.status, 400);
  assert.ok((await response.json()).error);
});

test('unknown API routes return a JSON 404', async () => {
  const response = await fetch(`${origin}/api/not-a-route`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'API endpoint not found.' });
});
