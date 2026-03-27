import { buildApp } from './app.js';
import { getOpenClawRuntimeConfig } from './config.js';

async function start() {
  const config = getOpenClawRuntimeConfig();
  const app = buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(
      `OpenClaw runtime running at http://${config.host}:${config.port}`,
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
