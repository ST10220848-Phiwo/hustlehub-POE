import express from 'express';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { logger } from './infrastructure/logging/logger.js';
import { requestId } from './middleware/requestId.js';
import { corsMiddleware, helmetMiddleware } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRouter } from './api/routes/index.js';

/**
 * Builds the Express app without starting a listener, so tests (and
 * supertest-style integration tests) can import it directly.
 */
export function createApp() {
  const app = express();

  // Trust the first proxy hop (e.g. container platform / load balancer) so
  // rate limiting and secure cookies see the real client protocol/IP.
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(helmetMiddleware());
  app.use(corsMiddleware());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => req.id,
      customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    })
  );

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}