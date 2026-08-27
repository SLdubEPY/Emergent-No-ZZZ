import { app } from './app.js';
import { config } from './config.js';

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`NO ZZZ secure API listening on ${config.port} (${config.env})`);
  if (!config.persistentStorage) console.warn('Development mode: encrypted venture storage is ephemeral. Set DATA_ENCRYPTION_KEY for persistence.');
});

function shutdown(signal) {
  console.log(`${signal} received; draining connections`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
