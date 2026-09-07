import { Router } from 'express';
import { checkDatabaseConnection } from '../../infrastructure/db/connection.js';

export const healthRouter = Router();

// Liveness: process is up and can respond at all.
healthRouter.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness: process is up AND its dependencies (DB) are reachable.
// Used by Docker health checks / orchestration to gate traffic.
healthRouter.get('/health/ready', (req, res) => {
  const dbOk = checkDatabaseConnection();
  const status = dbOk ? 200 : 503;
  res.status(status).json({
    status: dbOk ? 'ok' : 'degraded',
    dependencies: { database: dbOk ? 'ok' : 'unreachable' },
  });
});