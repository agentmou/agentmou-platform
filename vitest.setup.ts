process.env.NODE_ENV ??= 'test';
process.env.LOG_LEVEL ??= 'silent';
process.env.JWT_SECRET ??= 'test-jwt-secret';
process.env.CORS_ORIGIN ??= 'http://localhost:3000';
process.env.WEB_APP_BASE_URL ??= 'http://localhost:3000';
process.env.DATABASE_URL ??=
  'postgresql://postgres:postgres@127.0.0.1:5432/agentmou';
process.env.REDIS_URL ??= 'redis://127.0.0.1:6379';
process.env.NEXT_PUBLIC_API_URL ??= 'http://127.0.0.1:3001';
