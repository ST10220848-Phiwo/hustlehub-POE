import { authService } from '../application/auth.service.js';
import { ACCESS_TOKEN_COOKIE, getAuthCookieOptions } from '../config/jwt.js';

export async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const user = await authService.registerUser({ name, email, password, role });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.authenticateUser({ email, password });

    // The token is delivered ONLY via an httpOnly cookie, never in the
    // JSON body. httpOnly means client-side JavaScript cannot read it, so
    // an XSS bug in the frontend can't simply read `localStorage`/a JS
    // variable and exfiltrate the session - the browser attaches the
    // cookie automatically on same-site requests instead.
    res.cookie(ACCESS_TOKEN_COOKIE, token, getAuthCookieOptions());
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export function logout(req, res) {
  // clearCookie needs the same attributes (path/sameSite/secure) used when
  // the cookie was set, or some browsers won't match and clear it.
  const { maxAge, ...clearOptions } = getAuthCookieOptions();
  res.clearCookie(ACCESS_TOKEN_COOKIE, clearOptions);
  res.status(204).send();
}

export function me(req, res) {
  // req.user is set by the `authenticate` middleware from a verified,
  // DB-confirmed-active token - never trust a client-supplied user id here.
  res.status(200).json({ user: req.user });
}