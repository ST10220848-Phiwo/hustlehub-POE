import test from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../src/infrastructure/db/models/User.js';

test('a valid user document passes validation', () => {
  const user = new User({
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'irrelevant-value-for-this-test',
    roles: ['freelancer'],
  });

  const err = user.validateSync();

  assert.equal(err, undefined);
});

test('a user can hold both client and freelancer roles at once', () => {
  const user = new User({
    name: 'Test User',
    email: 'test-dual@example.com',
    passwordHash: 'hash',
    roles: ['client', 'freelancer'],
  });

  const err = user.validateSync();

  assert.equal(err, undefined);
  assert.deepEqual(user.roles, ['client', 'freelancer']);
});

test('rejects an invalid email format', () => {
  const user = new User({
    name: 'Test User',
    email: 'not-an-email',
    passwordHash: 'hash',
    roles: ['client'],
  });

  const err = user.validateSync();

  assert.ok(err);
  assert.ok(err.errors.email);
});

test('rejects a role outside the allowed enum', () => {
  const user = new User({
    name: 'Test User',
    email: 'test2@example.com',
    passwordHash: 'hash',
    roles: ['superadmin'],
  });

  const err = user.validateSync();

  assert.ok(err);
  assert.ok(err.errors['roles.0']);
});

test('defaults roles to ["client"] when omitted', () => {
  const user = new User({
    name: 'Test User',
    email: 'test3@example.com',
    passwordHash: 'hash',
  });

  assert.deepEqual(user.roles, ['client']);
});

test('rejects an empty roles array', () => {
  const user = new User({
    name: 'Test User',
    email: 'test-empty@example.com',
    passwordHash: 'hash',
    roles: [],
  });

  const err = user.validateSync();

  assert.ok(err);
  assert.ok(err.errors.roles);
});

test('rejects admin combined with another role', () => {
  const user = new User({
    name: 'Test User',
    email: 'test-admin-combo@example.com',
    passwordHash: 'hash',
    roles: ['admin', 'client'],
  });

  const err = user.validateSync();

  assert.ok(err);
  assert.ok(err.errors.roles);
});

test('allows admin alone', () => {
  const user = new User({
    name: 'Test User',
    email: 'test-admin@example.com',
    passwordHash: 'hash',
    roles: ['admin'],
  });

  const err = user.validateSync();

  assert.equal(err, undefined);
});

test('requires passwordHash', () => {
  const user = new User({
    name: 'Test User',
    email: 'test4@example.com',
    roles: ['client'],
  });

  const err = user.validateSync();

  assert.ok(err);
  assert.ok(err.errors.passwordHash);
});

test('requires name', () => {
  const user = new User({
    email: 'test5@example.com',
    passwordHash: 'hash',
    roles: ['client'],
  });

  const err = user.validateSync();

  assert.ok(err);
  assert.ok(err.errors.name);
});

test('defaults isActive to true', () => {
  const user = new User({
    name: 'Test User',
    email: 'test6@example.com',
    passwordHash: 'hash',
  });

  assert.equal(user.isActive, true);
});

test('hasRole() reflects the roles array', () => {
  const user = new User({
    name: 'Test User',
    email: 'test-hasrole@example.com',
    passwordHash: 'hash',
    roles: ['client', 'freelancer'],
  });

  assert.equal(user.hasRole('freelancer'), true);
  assert.equal(user.hasRole('admin'), false);
});

test('toJSON strips passwordHash and __v even if the field was selected', () => {
  const user = new User({
    name: 'Test User',
    email: 'test7@example.com',
    passwordHash: 'super-secret-hash',
    roles: ['client'],
  });

  const json = user.toJSON();

  assert.equal(json.passwordHash, undefined);
  assert.equal(json.__v, undefined);
  assert.equal(json.email, 'test7@example.com');
});