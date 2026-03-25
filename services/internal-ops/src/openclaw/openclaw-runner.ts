import {
  AgentProfileSchema,
  OpenClawCapabilitySchema,
  OpenClawTraceResponseSchema,
  OpenClawTurnInputSchema,
  OpenClawTurnResultSchema,
  type AgentProfile,
  type OpenClawCapability,
  type OpenClawTraceResponse,
  type OpenClawTurnInput,
  type OpenClawTurnResult,
} from '@agentmou/contracts';

interface OpenClawRunnerOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface OpenClawRunner {
  registerAgentProfiles(
    tenantId: string,
    profiles: AgentProfile[],
  ): Promise<void>;
  registerCapabilities(
    tenantId: string,
    capabilities: OpenClawCapability[],
  ): Promise<void>;
  startTurn(input: OpenClawTurnInput): Promise<OpenClawTurnResult>;
  continueTurn(input: OpenClawTurnInput): Promise<OpenClawTurnResult>;
  cancelObjective(input: {
    tenantId: string;
    objectiveId: string;
    remoteSessionId: string;
    reason?: string;
  }): Promise<void>;
  fetchTrace(input: {
    tenantId: string;
    objectiveId: string;
    remoteSessionId: string;
  }): Promise<OpenClawTraceResponse>;
}

export class HttpOpenClawAdapter implements OpenClawRunner {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(options: OpenClawRunnerOptions = {}) {
    this.baseUrl = (
      options.baseUrl ??
      process.env.OPENCLAW_API_URL ??
      ''
    ).replace(/\/$/, '');
    this.apiKey = options.apiKey ?? process.env.OPENCLAW_API_KEY;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.OPENCLAW_TIMEOUT_MS ?? 15000);
  }

  async registerAgentProfiles(tenantId: string, profiles: AgentProfile[]) {
    this.ensureConfigured();
    await this.request('/v1/internal-ops/agent-profiles/register', {
      method: 'POST',
      body: {
        tenantId,
        profiles: profiles.map((profile) => AgentProfileSchema.parse(profile)),
      },
    });
  }

  async registerCapabilities(
    tenantId: string,
    capabilities: OpenClawCapability[],
  ) {
    this.ensureConfigured();
    await this.request('/v1/internal-ops/capabilities/register', {
      method: 'POST',
      body: {
        tenantId,
        capabilities: capabilities.map((capability) =>
          OpenClawCapabilitySchema.parse(capability),
        ),
      },
    });
  }

  async startTurn(input: OpenClawTurnInput) {
    this.ensureConfigured();
    return OpenClawTurnResultSchema.parse(
      await this.request('/v1/internal-ops/turns/start', {
        method: 'POST',
        body: OpenClawTurnInputSchema.parse(input),
      }),
    );
  }

  async continueTurn(input: OpenClawTurnInput) {
    this.ensureConfigured();
    return OpenClawTurnResultSchema.parse(
      await this.request('/v1/internal-ops/turns/continue', {
        method: 'POST',
        body: OpenClawTurnInputSchema.parse(input),
      }),
    );
  }

  async cancelObjective(input: {
    tenantId: string;
    objectiveId: string;
    remoteSessionId: string;
    reason?: string;
  }) {
    this.ensureConfigured();
    await this.request(`/v1/internal-ops/objectives/${input.objectiveId}/cancel`, {
      method: 'POST',
      body: {
        tenantId: input.tenantId,
        remoteSessionId: input.remoteSessionId,
        reason: input.reason,
      },
    });
  }

  async fetchTrace(input: {
    tenantId: string;
    objectiveId: string;
    remoteSessionId: string;
  }) {
    this.ensureConfigured();
    return OpenClawTraceResponseSchema.parse(
      await this.request(
        `/v1/internal-ops/objectives/${input.objectiveId}/trace?tenantId=${encodeURIComponent(
          input.tenantId,
        )}&remoteSessionId=${encodeURIComponent(input.remoteSessionId)}`,
        {
          method: 'GET',
        },
      ),
    );
  }

  private ensureConfigured() {
    if (!this.baseUrl) {
      throw new Error('OPENCLAW_API_URL must be configured for internal ops.');
    }
  }

  private async request(
    path: string,
    options: {
      method: 'GET' | 'POST';
      body?: Record<string, unknown>;
    },
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method,
        headers: {
          'content-type': 'application/json',
          ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `OpenClaw request failed (${response.status} ${response.statusText}): ${text}`,
        );
      }

      if (response.status === 204) {
        return {};
      }

      return (await response.json()) as Record<string, unknown>;
    } finally {
      clearTimeout(timeout);
    }
  }
}
