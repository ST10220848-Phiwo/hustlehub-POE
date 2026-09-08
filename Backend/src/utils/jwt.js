import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export function signAccessToken({ id, roles }) {
  return jwt.sign({ roles }, env.JWT_SECRET, {
    subject: String(id),
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}