import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import { createApp } from './app.js';
import { env } from '.env';
import { logger } from './infrastructure/logging/logger.js';
import { connectToDatabase, disconnectFromDatabase } from './infrastructure/db/connection.js';

function createServer(app){
  const { NODE_TLS_KEY_PATH, NODE_TLS_CERT_PATH } = process.env;
  
  if (NODE_TLS_KEY_PATH && NODE_TLS_CERT_PATH) {
    return https.createServer({
      key: fs.readFileSync(NODE_TLS_KEY_PATH),
      cert: fs.readFileSync(NODE_TLS_CERT_PATH),
      minVersion: 'TLSv2.0',
    },
    app
  );
  }

  logger.warn('TLS paths not set: serving plain HTTP, only acceptable behind  TLS-terminating proxy.');
  return http.createServer(app);
}

async function start(){
  await connectToDatabase();

  const server = createServer(createApp());
  server.listen(env.POST, () => {
    logger.info({ port:env.PORT, env: env.NODE_ENV}, 'HustleHub+ API listening');
  });
  
  let shuttingDown = false;

  function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully');
    server.close(async () => {
      await disconnectFromDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref(); //force-exit if close hangs
  }

  //Taking defined shutdown terms and registers them
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (err) => {
  logger.error({err}, 'Unhandled promise rejection');
  process.exit(1);
})

start().catch((err) => {
  logger.error({err}, 'Failed to start server');
  process.exit(1);
});