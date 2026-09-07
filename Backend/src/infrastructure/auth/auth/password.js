import bcrypt from 'bcrypt';
import { env } from '../../config/env.js';

/**
 * Hashes a plaintext password with bcrypt at the configured cost factor.
 * Called by the application layer (e.g. a future registerUser use case)
 * before persisting - never store a plaintext password, ever, even
 * temporarily in a log or error message.
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.BCRYPT_COST_FACTOR);
}

/**
 * Compares a plaintext password against a stored bcrypt hash. Returns a
 * boolean rather than throwing, so callers can't accidentally leak timing
 * or error-message differences between "user not found" and "wrong
 * password" - that distinction should never reach the client either way.
 */
export async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}