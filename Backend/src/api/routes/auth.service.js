import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/passwordHasher.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';
import { AppError } from '../utils/AppError.js';

// Roles a person can grant themselves at registration. 'admin' is
// deliberately excluded: if it weren't, anyone could POST
// { "role": "admin" } to /register and grant themselves administrative
// access - role must never be trusted from client input beyond this
// allow-list. Admin accounts are created out-of-band (seed script / an
// existing admin's user-management action, not yet built).
const SELF_REGISTERABLE_ROLES = ['client', 'freelancer'];

// ASSUMPTION: the POE/addendum available to this assistant does not specify
// a password policy. 8 characters is a common minimum baseline, kept here
// as a single named constant (not env-configurable) since a password
// policy is a security control that shouldn't vary silently by
// environment. Revisit if the POE specifies something stricter.
const MIN_PASSWORD_LENGTH = 8;

function defaultSignToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function sanitize(userDoc) {
  // Reuses the toJSON transform already defined on the User schema, which
  // strips passwordHash and __v - one definition of "safe to return",
  // not duplicated here.
  return typeof userDoc.toJSON === 'function' ? userDoc.toJSON() : userDoc;
}

/**
 * Factory rather than a bare set of functions importing User/jwt/bcrypt
 * directly, so tests can inject a fake UserModel/hasher/signToken and
 * exercise the real business logic (role guard, enumeration-safe errors,
 * validation) without a live database. Production code uses the default
 * export below, which wires the real Mongoose model and real crypto.
 */
export function createAuthService({
  UserModel = User,
  hasher = { hashPassword, comparePassword },
  signToken = defaultSignToken,
} = {}) {
  async function registerUser({ name, email, password, role }) {
    if (!name || !email || !password) {
      throw new AppError(400, 'name, email and password are required.', 'Validation Error');
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new AppError(400, `password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 'Validation Error');
    }

    // Anything outside the allow-list (including an attempted 'admin', or
    // garbage input) silently falls back to 'client' rather than erroring -
    // a normal registration request that omits `role` should still
    // succeed, while nothing can escalate itself to a privileged role.
    const requestedRole = SELF_REGISTERABLE_ROLES.includes(role) ? role : 'client';

    const passwordHash = await hasher.hashPassword(password);

    try {
      const user = await UserModel.create({ name, email, passwordHash, role: requestedRole });
      return sanitize(user);
    } catch (err) {
      if (err.code === 11000) {
        throw new AppError(409, 'An account with this email already exists.', 'Conflict');
      }
      if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map((e) => e.message).join('; ');
        throw new AppError(400, message, 'Validation Error');
      }
      throw err;
    }
  }

  async function authenticateUser({ email, password }) {
    if (!email || !password) {
      throw new AppError(400, 'email and password are required.', 'Validation Error');
    }

    // select('+passwordHash') is required because the schema excludes it
    // by default (see User.js) - this is the one legitimate place to ask
    // for it.
    const user = await UserModel.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');

    // Identical error for "no such account", "wrong password", and
    // "account disabled" on purpose: differentiating any of these in the
    // response lets an attacker enumerate valid emails or probe account
    // status. Do not add detail here even for debugging convenience.
    const invalidCredentials = () => new AppError(401, 'Invalid email or password.', 'Unauthorized');

    if (!user) throw invalidCredentials();
    if (!user.isActive) throw invalidCredentials();

    const passwordMatches = await hasher.comparePassword(password, user.passwordHash);
    if (!passwordMatches) throw invalidCredentials();

    const token = signToken({ sub: user._id.toString(), role: user.role });
    return { user: sanitize(user), token };
  }

  return { registerUser, authenticateUser };
}

export const authService = createAuthService();