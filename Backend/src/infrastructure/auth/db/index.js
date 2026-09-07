import { Router } from 'express';
import { getConnectionState } from '../infrastructure/db/index.js';
import authRouter from './auth.routes.js';
import gigsRouter from './gigs.routes.js';
import bookingsRouter from './bookings.routes.js';
import transactionsRouter from './transactions.routes.js';
import dashboardRouter from './dashboard.routes.js';

// Central mount point so app.js stays a thin composition root - it imports
// this one router rather than knowing about every feature router
// individually. As each feature slice is built, uncomment its import and
// router.use(...) line below. Nothing is stubbed with fake handlers: an
// unmounted route should 404, not return a fabricated success response.


const router = Router();

// Liveness/readiness check for container orchestration and the Azure
// DevOps pipeline's post-deploy smoke test. Reports DB connection state
// rather than just "the process is up", since a backend with no DB
// connection is not actually ready to serve most requests.
router.get('/health', (req, res) => {
  const dbState = getConnectionState();
  const dbConnected = dbState === 1;

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    db: { connected: dbConnected, readyState: dbState },
    timestamp: new Date().toISOString(),
  });
});

// TODO (in build order): wire these up as each feature's controller,
// service, and authorization middleware are implemented. Every one of
// these MUST sit behind the (not yet built) `authenticate` middleware
// except the public gig-browsing endpoints, and MUST enforce
// ownership/role checks server-side per the project's non-negotiable
// constraints - do not treat this file as the place those checks live.
// router.use('/auth', authRouter);
// router.use('/gigs', gigsRouter);
// router.use('/bookings', bookingsRouter);
// router.use('/transactions', transactionsRouter);
// router.use('/dashboard', dashboardRouter);

export default router;