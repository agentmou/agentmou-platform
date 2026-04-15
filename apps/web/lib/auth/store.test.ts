import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginApiMock = vi.fn();
const registerApiMock = vi.fn();
const fetchMeMock = vi.fn();
const logoutApiMock = vi.fn();

vi.mock('./api', () => ({
  loginApi: loginApiMock,
  registerApi: registerApiMock,
  fetchMe: fetchMeMock,
  logoutApi: logoutApiMock,
}));

async function loadStore() {
  return import('./store');
}

describe('auth store', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useAuthStore } = await loadStore();
    useAuthStore.setState({
      user: null,
      tenants: [],
      activeTenantId: null,
      session: null,
      isLoading: false,
      isHydrated: false,
    });
  });

  it('stores cookie-based login responses without keeping a token in state', async () => {
    loginApiMock.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'owner@example.com',
        name: 'Owner',
      },
      tenants: [
        {
          id: 'tenant-1',
          name: 'Demo Workspace',
          plan: 'enterprise',
          role: 'admin',
        },
      ],
      session: null,
    });

    const { useAuthStore } = await loadStore();
    const tenantId = await useAuthStore.getState().login('owner@example.com', 'secret123', true);

    expect(tenantId).toBe('tenant-1');
    expect(useAuthStore.getState()).toMatchObject({
      user: {
        email: 'owner@example.com',
      },
      activeTenantId: 'tenant-1',
      isHydrated: true,
    });
    expect(loginApiMock).toHaveBeenCalledWith('owner@example.com', 'secret123', true);
    expect('token' in useAuthStore.getState()).toBe(false);
  });

  it('hydrates from /auth/me and clears state when the cookie session is gone', async () => {
    fetchMeMock.mockRejectedValue(new Error('401'));

    const { useAuthStore } = await loadStore();
    await useAuthStore.getState().hydrate();

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      tenants: [],
      activeTenantId: null,
      session: null,
      isHydrated: true,
      isLoading: false,
    });
  });

  it('refreshes into impersonation state without any client-side restore token', async () => {
    fetchMeMock.mockResolvedValue({
      user: {
        id: 'user-target',
        email: 'target@example.com',
        name: 'Target',
        tenants: [
          {
            id: 'tenant-target',
            name: 'Target Clinic',
            plan: 'pro',
            role: 'operator',
          },
        ],
      },
      session: {
        isImpersonation: true,
        impersonationSessionId: 'session-1',
        actorUserId: 'user-admin',
        actorTenantId: 'tenant-admin',
        targetUserId: 'user-target',
        targetTenantId: 'tenant-target',
      },
    });

    const { useAuthStore } = await loadStore();
    const activeTenantId = await useAuthStore.getState().refreshSession({
      preferredTenantId: 'tenant-target',
    });

    expect(activeTenantId).toBe('tenant-target');
    expect(useAuthStore.getState()).toMatchObject({
      activeTenantId: 'tenant-target',
      session: {
        isImpersonation: true,
        actorTenantId: 'tenant-admin',
      },
    });
  });
});
