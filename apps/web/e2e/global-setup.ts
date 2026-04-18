import { startMockApiServer, type MockApiServer } from './fixtures/mock-server';

/**
 * Start the in-process mock API server once for the whole suite.
 *
 * Playwright may import the config twice (once to boot the webServer,
 * once for the test runner). The second import must not fail with
 * EADDRINUSE, so we swallow that specific error and rely on the
 * already-running instance.
 *
 * The returned function is Playwright's convention for a teardown
 * callback — it fires after the test run, before the process exits.
 */

const MOCK_API_PORT = Number(process.env.E2E_MOCK_API_PORT ?? 47321);

async function startOrReuse(): Promise<MockApiServer | null> {
  try {
    return await startMockApiServer(MOCK_API_PORT);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      console.log(
        `[e2e] Mock API port ${MOCK_API_PORT} is already in use — reusing the existing listener.`
      );
      return null;
    }
    throw error;
  }
}

export default async function globalSetup() {
  const server = await startOrReuse();
  if (server) {
    console.log(`[e2e] Mock API server listening on ${server.url}`);
  }
  process.env.E2E_MOCK_API_URL = `http://127.0.0.1:${MOCK_API_PORT}`;

  return async () => {
    if (server) {
      await server.close();
    }
  };
}
