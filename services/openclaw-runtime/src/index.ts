import { buildApp } from './app.js';

async function start() {
  const app = buildApp();

  try {
    const port = Number.parseInt(process.env.PORT || '3003', 10);
    const host = process.env.HOST || '0.0.0.0';
    await app.listen({ port, host });
    console.log(`OpenClaw runtime running at http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
