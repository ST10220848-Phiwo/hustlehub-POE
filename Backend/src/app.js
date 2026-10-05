import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import apiRouter from './api/routes/index.js';
import { healthRouter } from './api/routes/health.routes.js';
import { notFound } from './middleware/errorHandler.js';
import { AppError } from '../src/utils/appError.js';

//only accept client-supplied request IDs that look like IDs
//they can't be used to inject fake lines into the logs
const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

function parseAllowedOrigins(){
  return (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function createApp(){
  const app = express();

  //only trust X-Forwarded-For when actually behind a proxy
  //unverified trust lets people fake their IP and avoid rate limits
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (proxyHops > 0) app.set('trust proxy', proxyHops);

  //Correlated IDs for logging purposes
  app.use((req, res, next) => {
    const incoming = req.get('x-request-id');
    req.requestId = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  })

  //Access logging
  if (process.env.NODE_ENV !== 'test'){
    morgan.token('reqId', (req) => req.requestId);
    app.use(morgan(':reqId :method :url :status :res[content-length] - :response-time ms'));
  }

  //Security headers, this is a JSON API, so it should never render as a page or be framed
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"]},
      },
      // cspell:disable-next-line
      hsts: { maxAge: 31536000, includeSubDomains: true },
      referrerPolicy: { policy: 'no-referrer'},
    })
  );


  //CORS: exactly one cors() call, with an allow-list
  const allowedOrigins = parseAllowedOrigins();
  app.use(
    cors({
      origin(origin, callback) {
        // No origin headers = not a browser cross-origin request (curl, Postman, health checks)
        if (!origin || allowedOrigins.include(origin)) return callback(null, true);
        return callback(AppError.forbidden('Origin not allowed.'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    })
  );

  //Body parsing with size limits(payload-size DoS protection)
  //False avoids nested-object parsing of form bodies
  app.use(express.json({ limit: '100kb'}));
  app.use(express.urlencoded({ extended: false, limit: '100kb'}));
  app.use(cookieParser());  //defines req.cookies so that cookie auth work

  //Health checks before the limiter
  app.use('/api/v2', healthRouter);

  //Global Rate limit and API routes to be mounted
  const globalLimiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15*60*100,
    limit: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next, options) => next(AppError.tooManyRequests(options.message)),
  });
  app.use('/api/v2', globalLimiter, apiRouter);

  //404 then the error handler, always last
  app.use(notFound);
  app.use(errorHandler);

  return app;
}