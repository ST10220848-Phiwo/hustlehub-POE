/**
 * This module exports the configuration for JWT (JSON Web Token) authentication.
 * It reads the JWT secret and expiration time from environment variables and provides a frozen configuration object.
 * It also provides a function to get cookie options for storing the access token in HTTP-only cookies.
 */

const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

if(!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

const ACCESS_TOKEN_EXPIRES_IN = JWT_EXPIRES_IN || '45m'; //45 MINUTES

export const jwtConfig = Object.freeze({
    secret: JWT_SECRET,
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: 'HustleHubPlus-api',
    audience: 'HustleHubPlus-web',
});

export const ACCESS_TOKEN_COOKIE = 'access_token';

export function getAuthCookieOptions() {
    return {
        httpOnly: true, //unreadable by the frontend JS, only sent in HTTP requests
        secure: process.env.NODE_ENV === 'production', //only sent over HTTPS in production
        sameSite: 'strict', //only sent in requests originating from the same site
        maxAge: ACCESS_TOKEN_EXPIRES_IN ? parseDuration(ACCESS_TOKEN_EXPIRES_IN) : undefined, //in milliseconds
    };
}
