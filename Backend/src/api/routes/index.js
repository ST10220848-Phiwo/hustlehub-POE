// This module deliberately does NOT replace ../../connection.js.
// connection.js remains the single shared `mongoose` instance that every
// model file imports (see User.js, Gig.js, Booking.js, Transaction.js,
// AuditLog.js - all `import { mongoose } from '../connection.js'`).
// This wrapper only owns the *lifecycle* around that shared instance:
// connecting on boot, logging connection-state events, and disconnecting
// cleanly on shutdown - concerns that don't belong inside a schema file.
// `.connect()`. If your actual connection.js already calls connect()
// internally, remove the connect() call below to avoid a double-connect,
// and keep only the event listeners / disconnect() from this module.
// Adjust the relative import path if your repo layout differs.

import { mongoose } from '../../connection.js';

let hasAttachedListeners = false;

function attachConnectionListeners(logger) {
  if (hasAttachedListeners) return;
  hasAttachedListeners = true;

  mongoose.connection.on('connected', () => {
    logger.info('[db] connected', { host: mongoose.connection.host, name: mongoose.connection.name });
  });

  mongoose.connection.on('error', (err) => {
    // Never log the raw connection string here - it can contain
    // credentials. Log the error message/stack only.
    logger.error('[db] connection error', { message: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('[db] disconnected');
  });
}

/**
 * Connects the shared mongoose instance to MONGODB_URI.
 * Throws if MONGODB_URI is missing or the connection fails - callers
 * (server.js) are expected to fail fast on startup rather than run with no
 * database, since every current route/use case depends on it.
 *
 * @param {{ uri?: string, logger?: Console }} [options]
 */
export async function connectDB({ uri = process.env.MONGODB_URI, logger = console } = {}) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and configure it.');
  }

  attachConnectionListeners(logger);

  // maxPoolSize / server selection timeout kept explicit and modest for a
  // small POE deployment rather than left at library defaults, so a
  // misconfigured URI fails fast instead of hanging the process.
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  });

  return mongoose.connection;
}

/**
 * Gracefully closes the database connection. Call this from server.js on
 * SIGINT/SIGTERM so in-flight writes aren't cut off mid-request.
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return; // already disconnected
  await mongoose.connection.close();
}

export function getConnectionState() {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  return mongoose.connection.readyState;
}