// Control Plane API - Fastify server
import { buildApp } from './app.js';
import { getApiConfig } from './config.js';

const start = async () => {
  const config = getApiConfig();
  const app = buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(
      `Control Plane API running at http://${config.host}:${config.port}`,
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
