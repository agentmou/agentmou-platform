import { buildApp } from './app.js';
import { getInternalOpsConfig } from './config.js';

async function start() {
  const config = getInternalOpsConfig();
  const app = buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(
      `Internal Ops service running at http://${config.host}:${config.port}`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
