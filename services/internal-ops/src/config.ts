export interface InternalOpsConfig {
  host: string;
  port: number;
  logLevel: string;
  corsOrigin: string;
}

export interface InternalOpsServiceConfig {
  tenantId: string;
  telegramBotToken?: string;
  telegramWebhookSecret?: string;
  callbackSecret?: string;
  allowedChatIds: string[];
  allowedUserIds: string[];
  openClawApiUrl: string;
  openClawApiKey?: string;
  openClawTimeoutMs: number;
}

function parsePort(value: string | undefined, fallback: number) {
  const port = Number.parseInt(value ?? String(fallback), 10);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT must be a positive integer, received ${value ?? ''}`);
  }

  return port;
}

function requireCorsOrigin() {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN;
  }

  if (process.env.NODE_ENV === 'test') {
    return 'http://localhost:3000';
  }

  throw new Error('CORS_ORIGIN must be set');
}

function requireNonEmptyEnv(name: string, value: string | undefined) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${name} must be set`);
  }

  return normalized;
}

function parseEnvIdList(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getInternalOpsConfig(): InternalOpsConfig {
  return {
    host: process.env.HOST ?? '0.0.0.0',
    port: parsePort(process.env.PORT, 3002),
    logLevel: process.env.LOG_LEVEL ?? 'info',
    corsOrigin: requireCorsOrigin(),
  };
}

export function getInternalOpsServiceConfig(): InternalOpsServiceConfig {
  return {
    tenantId: requireNonEmptyEnv(
      'INTERNAL_OPS_TENANT_ID',
      process.env.INTERNAL_OPS_TENANT_ID,
    ),
    telegramBotToken: process.env.INTERNAL_OPS_TELEGRAM_BOT_TOKEN,
    telegramWebhookSecret: process.env.INTERNAL_OPS_TELEGRAM_WEBHOOK_SECRET,
    callbackSecret: process.env.INTERNAL_OPS_CALLBACK_SECRET,
    allowedChatIds: parseEnvIdList(process.env.INTERNAL_OPS_TELEGRAM_ALLOWED_CHAT_IDS),
    allowedUserIds: parseEnvIdList(process.env.INTERNAL_OPS_TELEGRAM_ALLOWED_USER_IDS),
    openClawApiUrl: requireNonEmptyEnv('OPENCLAW_API_URL', process.env.OPENCLAW_API_URL).replace(/\/$/, ''),
    openClawApiKey: process.env.OPENCLAW_API_KEY,
    openClawTimeoutMs: parsePort(process.env.OPENCLAW_TIMEOUT_MS, 15000),
  };
}
