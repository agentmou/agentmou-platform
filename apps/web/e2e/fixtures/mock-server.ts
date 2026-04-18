import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';

/**
 * Tiny in-process mock of the Agentmou API surface.
 *
 * The Next server-side code (AuthStoreBootstrap, admin layout) calls
 * `http://$NEXT_PUBLIC_API_URL/api/v1/auth/me` during SSR. Playwright's
 * `page.route()` only intercepts browser requests, not server-side
 * fetches, so we need an actual HTTP listener for SSR boundaries.
 *
 * The handlers cover just enough surface for the smoke suite to render:
 *   - /api/v1/auth/me: return a canned session or 401
 *   - /api/v1/auth/oauth/providers: return no providers
 *   - /api/v1/auth/login: return canned user + tenants
 *   - /api/v1/auth/logout: return ok
 *   - /api/v1/admin/tenants*: return canned tenants / detail / features
 *
 * The test harness picks an ephemeral port and rewrites
 * `NEXT_PUBLIC_API_URL` to match before building; see `test:e2e` in
 * `apps/web/package.json`.
 */

const ADMIN_TENANT = {
  id: 'admin-tenant',
  name: 'Agentmou Internal',
  type: 'business' as const,
  plan: 'enterprise' as const,
  ownerId: 'user-actor',
  createdAt: '2026-01-01T00:00:00.000Z',
  settings: {
    timezone: 'Europe/Madrid',
    defaultHITL: false,
    logRetentionDays: 30,
    memoryRetentionDays: 7,
    activeVertical: 'internal' as const,
    isPlatformAdminTenant: true,
    settingsVersion: 2,
    verticalClinicUi: false,
    clinicDentalMode: false,
    internalPlatformVisible: true,
  },
  role: 'owner' as const,
};

const MANAGED_TENANT_SUMMARY = {
  id: 'managed-tenant-1',
  name: 'Clínica Sonrisa',
  type: 'business' as const,
  plan: 'pro' as const,
  ownerId: 'user-clinic',
  createdAt: '2026-02-01T00:00:00.000Z',
  activeVertical: 'clinic' as const,
  isPlatformAdminTenant: false,
  userCount: 5,
};

const ME_PAYLOAD = {
  user: {
    id: 'user-actor',
    email: 'admin@agentmou.test',
    name: 'Admin Actor',
    tenants: [ADMIN_TENANT],
  },
  session: null,
};

const LOGIN_PAYLOAD = {
  user: {
    id: 'user-actor',
    email: 'admin@agentmou.test',
    name: 'Admin Actor',
  },
  tenants: [ADMIN_TENANT],
  session: null,
};

const TENANT_LIST_PAYLOAD = {
  tenants: [
    MANAGED_TENANT_SUMMARY,
    {
      ...MANAGED_TENANT_SUMMARY,
      id: 'managed-tenant-2',
      name: 'Centro Norte',
      plan: 'starter' as const,
      activeVertical: 'fisio' as const,
      userCount: 2,
    },
  ],
};

const TENANT_DETAIL_PAYLOAD = {
  tenant: {
    ...MANAGED_TENANT_SUMMARY,
    settings: {
      timezone: 'Europe/Madrid',
      defaultHITL: false,
      logRetentionDays: 30,
      memoryRetentionDays: 7,
      activeVertical: 'clinic' as const,
      isPlatformAdminTenant: false,
      settingsVersion: 2,
      verticalClinicUi: true,
      clinicDentalMode: true,
      internalPlatformVisible: false,
    },
    verticalConfigs: [],
  },
};

const TENANT_USERS_PAYLOAD = {
  users: [
    {
      userId: 'user-clinic-owner',
      membershipId: 'mem-1',
      tenantId: MANAGED_TENANT_SUMMARY.id,
      email: 'owner@clinic.test',
      name: 'Clinic Owner',
      role: 'owner' as const,
      hasPassword: true,
      joinedAt: '2026-02-02T00:00:00.000Z',
      lastActiveAt: '2026-04-10T12:00:00.000Z',
    },
  ],
};

const FEATURE_RESOLUTION_PAYLOAD = {
  resolution: {
    tenantId: MANAGED_TENANT_SUMMARY.id,
    plan: 'pro' as const,
    activeVertical: 'clinic' as const,
    modules: [
      {
        id: 'mod-core',
        tenantId: MANAGED_TENANT_SUMMARY.id,
        moduleKey: 'core_reception' as const,
        status: 'enabled' as const,
        visibleToClient: true,
        planLevel: 'free' as const,
        config: {},
        createdAt: '2026-02-02T00:00:00.000Z',
        updatedAt: '2026-02-02T00:00:00.000Z',
        enabled: true,
        beta: false,
        displayName: 'Core Reception',
        description: 'Bandeja, agenda, pacientes.',
        requiresConfig: false,
        visibilityState: 'visible' as const,
        visibilityReason: 'active' as const,
      },
    ],
    planEntitlements: {
      'plan.clinic.core_reception': true,
      'plan.clinic.voice.inbound': true,
    },
    rolloutFlags: {
      activeVertical: 'clinic' as const,
      isPlatformAdminTenant: false,
      adminConsoleEnabled: false,
      verticalClinicUi: true,
      clinicDentalMode: true,
      voiceInboundEnabled: true,
      voiceOutboundEnabled: false,
      whatsappOutboundEnabled: true,
      intakeFormsEnabled: true,
      appointmentConfirmationsEnabled: true,
      smartGapFillEnabled: false,
      reactivationEnabled: false,
      advancedClinicModeEnabled: false,
      internalPlatformVisible: false,
    },
    decisions: [
      {
        key: 'plan.clinic.core_reception',
        kind: 'plan' as const,
        enabled: true,
        source: 'plan-baseline',
        moduleKey: 'core_reception' as const,
        detail: 'Included in plan baseline.',
      },
      {
        key: 'plan.clinic.voice.inbound',
        kind: 'plan' as const,
        enabled: true,
        source: 'plan-baseline',
        moduleKey: 'voice' as const,
        detail: 'Included in plan baseline.',
      },
      {
        key: 'voiceInboundEnabled',
        kind: 'rollout' as const,
        enabled: true,
        source: 'readiness',
        moduleKey: 'voice' as const,
        detail: 'Voice inbound channel ready.',
      },
    ],
    rolloutDecisionsTrace: {
      voiceInboundEnabled: { enabled: true, source: 'readiness' },
      voiceOutboundEnabled: { enabled: false, source: 'readiness' },
      whatsappOutboundEnabled: { enabled: true, source: 'readiness' },
      intakeFormsEnabled: { enabled: true, source: 'readiness' },
      appointmentConfirmationsEnabled: { enabled: true, source: 'readiness' },
      smartGapFillEnabled: { enabled: false, source: 'entitlement' },
      reactivationEnabled: { enabled: false, source: 'entitlement' },
      advancedClinicModeEnabled: { enabled: false, source: 'entitlement' },
      internalPlatformVisible: { enabled: false, source: 'internal_access' },
      adminConsoleEnabled: { enabled: false, source: 'internal_access' },
    },
  },
};

export interface MockApiServer {
  readonly url: string;
  close(): Promise<void>;
}

export function startMockApiServer(port: number): Promise<MockApiServer> {
  return new Promise((resolve, reject) => {
    const server: Server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', 'http://placeholder');
      const path = url.pathname;
      const method = req.method ?? 'GET';

      if (process.env.E2E_DEBUG === '1') {
        console.log(`[mock-api] ${method} ${path} cookie=${req.headers.cookie ?? '(none)'}`);
      }

      res.setHeader('content-type', 'application/json');
      // CORS: echo the Origin header so `credentials: 'include'` fetches
      // from the web app succeed (the spec forbids using "*" when cookies
      // are in play).
      const origin = req.headers.origin ?? '*';
      res.setHeader('access-control-allow-origin', origin);
      res.setHeader('vary', 'origin');
      res.setHeader('access-control-allow-credentials', 'true');
      res.setHeader('access-control-allow-headers', 'content-type, x-tenant-id, authorization');
      res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS');

      // Preflight: every /api/v1/* endpoint accepts the same set of
      // headers and methods, so a blanket handler is enough for the suite.
      if (method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      // Auth endpoints ----------------------------------------------------
      if (path === '/api/v1/auth/me' && method === 'GET') {
        // SSR sends a cookie header when the browser has one primed. No
        // cookie → 401, which matches the real API behaviour and makes the
        // unauthenticated test branch reachable.
        if (!req.headers.cookie || !req.headers.cookie.includes('agentmou-session')) {
          res.statusCode = 401;
          res.end('{}');
          return;
        }
        res.statusCode = 200;
        res.end(JSON.stringify(ME_PAYLOAD));
        return;
      }

      if (path === '/api/v1/auth/oauth/providers' && method === 'GET') {
        res.statusCode = 200;
        res.end(JSON.stringify({ google: false, microsoft: false }));
        return;
      }

      if (path === '/api/v1/auth/login' && method === 'POST') {
        // Plant a cookie so subsequent /me calls see a logged-in user.
        res.setHeader(
          'set-cookie',
          'agentmou-session=fake-session-token; Path=/; HttpOnly; SameSite=Lax'
        );
        res.statusCode = 200;
        res.end(JSON.stringify(LOGIN_PAYLOAD));
        return;
      }

      if (path === '/api/v1/auth/logout' && method === 'POST') {
        res.setHeader('set-cookie', 'agentmou-session=; Path=/; Max-Age=0');
        res.statusCode = 200;
        res.end('{"ok":true}');
        return;
      }

      // Admin endpoints ---------------------------------------------------
      if (path.startsWith('/api/v1/admin/tenants') && method === 'GET') {
        if (path.endsWith('/feature-resolution')) {
          res.statusCode = 200;
          res.end(JSON.stringify(FEATURE_RESOLUTION_PAYLOAD));
          return;
        }
        if (path.endsWith('/users')) {
          res.statusCode = 200;
          res.end(JSON.stringify(TENANT_USERS_PAYLOAD));
          return;
        }
        const segments = path.split('/').filter(Boolean);
        const last = segments[segments.length - 1];
        if (last && last !== 'tenants') {
          res.statusCode = 200;
          res.end(JSON.stringify(TENANT_DETAIL_PAYLOAD));
          return;
        }

        // Collection — honour the `q` filter so the URL-state test can
        // assert filtered results.
        const q = url.searchParams.get('q')?.toLowerCase() ?? '';
        const tenants = q
          ? TENANT_LIST_PAYLOAD.tenants.filter((tenant) => tenant.name.toLowerCase().includes(q))
          : TENANT_LIST_PAYLOAD.tenants;
        res.statusCode = 200;
        res.end(JSON.stringify({ tenants }));
        return;
      }

      // Anything else is an unmocked call — surface loudly so test drift
      // shows up as a 599 body the page can't parse.
      res.statusCode = 599;
      res.end(JSON.stringify({ error: `Unexpected API call: ${method} ${path}` }));
    });

    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const address = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise<void>((resolveClose) => {
            server.close(() => resolveClose());
          }),
      });
    });
  });
}
