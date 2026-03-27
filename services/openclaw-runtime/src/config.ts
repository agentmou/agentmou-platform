import type { OpenClawStorageConfig } from './runtime/state-store.js';

export interface OpenClawRuntimeConfig {
  host: string;
  port: number;
  logLevel: string;
  apiKey?: string;
  openAiApiKey?: string;
  model: string;
  storage: OpenClawStorageConfig;
}

function parsePort(value: string | undefined, fallback: number) {
  const port = Number.parseInt(value ?? String(fallback), 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT must be a positive integer, received ${value ?? ''}`);
  }

  return port;
}

export function getOpenClawRuntimeConfig(): OpenClawRuntimeConfig {
  return {
    host: process.env.HOST ?? '0.0.0.0',
    port: parsePort(process.env.PORT, 3003),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    apiKey: process.env.OPENCLAW_API_KEY,
    openAiApiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENCLAW_MODEL ?? 'gpt-4o-mini',
    storage: {
      mode: 'file',
      stateDir: process.env.OPENCLAW_STATE_DIR ?? './.openclaw-state',
    },
  };
}
