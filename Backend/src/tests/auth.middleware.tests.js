import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticate, attachUserIfPresent, requireRole } from '../src/middleware/auth.js';
import { signAccessToken } from '../src/infrastructure/auth/jwt.js';
import { AppError } from '../src/utils/AppError.js';

function runMiddleware(middleware, req) {
  return new Promise((resolve) => {
    middleware(req, {}, (err) => resolve(err));
  });
}

test('authenticate rejects a request with no token', async () => {
  const err = await runMiddleware(authenticate, { cookies: {}, headers: {} });
  assert.ok(err instanceof AppError);
  assert.equal(err.status, 401);
});

test('authenticate attaches req.user.roles from a valid bearer token', async () => {
  const token = signAccessToken({ id: 'user123', roles: ['freelancer'] });
  const req = { cookies: {}, headers: { authorization: `Bearer ${token}` } };

  const err = await runMiddleware(authenticate, req);

  assert.equal(err, undefined);
  assert.equal(req.user.id, 'user123');
  assert.deepEqual(req.user.roles, ['freelancer']);
});

test('authenticate supports a user with multiple roles', async () => {
  const token = signAccessToken({ id: 'user999', roles: ['client', 'freelancer'] });
  const req = { cookies: {}, headers: { authorization: `Bearer ${token}` } };

  const err = await runMiddleware(authenticate, req);

  assert.equal(err, undefined);
  assert.deepEqual(req.user.roles, ['client', 'freelancer']);
});

test('authenticate reads the token from an httpOnly cookie', async () => {
  const token = signAccessToken({ id: 'user456', roles: ['client'] });
  const req = { cookies: { accessToken: token }, headers: {} };

  const err = await runMiddleware(authenticate, req);

  assert.equal(err, undefined);
  assert.equal(req.user.id, 'user456');
  assert.deepEqual(req.user.roles, ['client']);
});

test('authenticate rejects a tampered token', async () => {
  const token = signAccessToken({ id: 'user789', roles: ['admin'] });
  const tampered = `${token.slice(0, -2)}xx`;
  const req = { cookies: {}, headers: { authorization: `Bearer ${tampered}` } };

  const err = await runMiddleware(authenticate, req);

  assert.ok(err instanceof AppError);
  assert.equal(err.status, 401);
});

test('authenticate does not leak whether a failure was expiry vs. tampering', async () => {
  const token = signAccessToken({ id: 'user1', roles: ['client'] });
  const tampered = `${token.slice(0, -2)}xx`;
  const req = { cookies: {}, headers: { authorization: `Bearer ${tampered}` } };

  const err = await runMiddleware(authenticate, req);

  assert.equal(err.message, 'Invalid or expired session.');
});

test('attachUserIfPresent proceeds with no error and no req.user when no token is given', async () => {
  const req = { cookies: {}, headers: {} };

  const err = await runMiddleware(attachUserIfPresent, req);

  assert.equal(err, undefined);
  assert.equal(req.user, undefined);
});

test('attachUserIfPresent silently ignores an invalid token rather than rejecting', async () => {
  const req = { cookies: {}, headers: { authorization: 'Bearer not-a-real-token' } };

  const err = await runMiddleware(attachUserIfPresent, req);

  assert.equal(err, undefined);
  assert.equal(req.user, undefined);
});

test('requireRole allows a user who holds one of the allowed roles', async () => {
  const req = { user: { id: 'u1', roles: ['freelancer'] } };
  const guard = requireRole('freelancer', 'admin');

  const err = await runMiddleware(guard, req);

  assert.equal(err, undefined);
});

test('requireRole allows a dual-role user via either matching role', async () => {
  const req = { user: { id: 'u1', roles: ['client', 'freelancer'] } };
  const guard = requireRole('freelancer');

  const err = await runMiddleware(guard, req);

  assert.equal(err, undefined);
});

test('requireRole rejects a user who holds none of the allowed roles', async () => {
  const req = { user: { id: 'u1', roles: ['client'] } };
  const guard = requireRole('freelancer', 'admin');

  const err = await runMiddleware(guard, req);

  assert.ok(err instanceof AppError);
  assert.equal(err.status, 403);
});