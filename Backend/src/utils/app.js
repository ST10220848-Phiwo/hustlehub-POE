import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import routes from './routes/index.js';

export function createApp() {
  const app = express();

  // Trust the first proxy hop (needed for correct client IPs / rate
  // limiting behind a container platform's load balancer). Set to a
  // specific hop count rather than `true` once the real deployment
  // topology is known, to avoid trusting a spoofable X-Forwarded-For.
  app.set('trust proxy', 1);

  // Assigns a per-request correlation id BEFORE anything else runs, so
  // every log line and any AuditLog record for this request can be tied
  // together. Exposed back to the caller via a response header, which is
  // also useful for support/debugging without exposing internals.
  app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });

  app.use(helmet());

  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        // Allow no-origin requests (curl, server-to-server, health checks)
        // but reject any browser origin not explicitly allow-listed.
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Global baseline limiter. Auth endpoints (login, register, password
  // reset) will need a stricter, separate limiter once built - this one is
  // not tight enough on its own to stop credential-stuffing/brute force.
  app.use(
    rateLimit({
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
      max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Structured-ish access log including the correlation id, skipped in
  // test to keep test output clean. This is not a replacement for the
  // AuditLog collection - it's transport-level access logging.
  if (process.env.NODE_ENV !== 'test') {
    morgan.token('reqId', (req) => req.requestId);
    app.use(morgan(':reqId :method :url :status :res[content-length] - :response-time ms'));
  }

  app.use('/api/v1', routes);

  // 404 for anything unmatched - explicit rather than falling through to
  // Express's default HTML error page.
  app.use((req, res) => {
    res.status(404).json({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'The requested resource does not exist.',
      requestId: req.requestId,
    });
  });

  // Centralized error handler. Never leaks stack traces or internal
  
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[error] ${req.requestId}`, err.message);
    }
    res.status(status).json({
      type: 'about:blank',
      title: status === 500 ? 'Internal Server Error' : err.title || 'Error',
      status,
      detail: status === 500 ? 'An unexpected error occurred.' : err.message,
      requestId: req.requestId,
    });
  });

  return app;
}