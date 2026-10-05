import jwt from 'jsonwebtoken';
import { jwtConfig } from '../../config/jwt.js';

/**
 * This module provides utility functions for signing and verifying JWT access tokens.
 * It uses the configuration defined in the jwtConfig object, which includes the secret,
 * algorithm, expiration time, issuer, and audience.
 */

export function signAccessToken({ id, roles }) {
  return jwt.sign({ roles }, jwtConfig.secret, {
    subject: String(id),
    expiresIn: jwtConfig.expiresIn,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, jwtConfig.secret, {
    algorithms: [jwtConfig.algorithm],
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  });
}