import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './infrastructure/logging/logger.js';
import { connectToDatabase, disconnectFromDatabase } from './infrastructure/db/connection.js';

async function start() {
  await connectToDatabase();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'HustleHub+ API listening');
  });

  async function shutdown(signal) {
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(async () => {
      await disconnectFromDatabase();
      process.exit(0);
    });
    // Force-exit if graceful shutdown hangs.
    setTimeout(() => process.exit(1), 10000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});