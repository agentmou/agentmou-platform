// Control Plane API - Fastify server
import { buildApp } from './app.js';

const start = async () => {
  const app = buildApp();

  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });
    console.log(`Control Plane API running at http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
