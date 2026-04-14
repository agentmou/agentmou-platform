import { ReflagClient } from '@reflag/node-sdk';
import type { ModuleKey, TenantPlan, VerticalKey } from '@agentmou/contracts';
import { createServiceLogger } from '@agentmou/observability';

import type { FeatureFlagKey } from './catalog.js';

type FeatureFlagOverrideMap = Partial<Record<FeatureFlagKey, boolean>>;

export interface ReflagProviderConfig {
  sdkKey?: string;
  environment: string;
  baseUrl?: string;
}

export interface ReflagEvaluationContext {
  tenantId: string;
  activeVertical: VerticalKey;
  isPlatformAdminTenant: boolean;
  plan: TenantPlan;
  activeModules: ModuleKey[];
  activeChannels: string[];
  hasClinicProfile: boolean;
}

export interface ReflagOverrideResult {
  overrides: FeatureFlagOverrideMap | null;
  failureReason?: string;
}

export class ReflagProvider {
  private readonly logger = createServiceLogger('feature-flags.reflag');
  private readonly client: ReflagClient | null;
  private initializationPromise: Promise<void> | null = null;

  constructor(private readonly config: ReflagProviderConfig) {
    this.client = config.sdkKey
      ? new ReflagClient({
          secretKey: config.sdkKey,
          apiBaseUrl: config.baseUrl,
          logLevel: 'WARN',
        })
      : null;
  }

  async getOverrides(context: ReflagEvaluationContext): Promise<ReflagOverrideResult> {
    if (!this.client) {
      return {
        overrides: null,
        failureReason: 'reflag_sdk_key_missing',
      };
    }

    try {
      await this.ensureInitialized();
      const flags = this.client.getFlags({
        enableTracking: false,
        company: {
          id: context.tenantId,
          activeVertical: context.activeVertical,
          isPlatformAdminTenant: context.isPlatformAdminTenant,
          plan: context.plan,
        },
        other: {
          environment: this.config.environment,
          activeModules: context.activeModules,
          activeChannels: context.activeChannels,
          hasClinicProfile: context.hasClinicProfile,
        },
      }) as Record<string, { isEnabled: boolean } | undefined>;

      return {
        overrides: Object.fromEntries(
          Object.entries(flags).map(([key, flag]) => [key, Boolean(flag?.isEnabled)])
        ) as FeatureFlagOverrideMap,
      };
    } catch (error) {
      this.logger.warn(
        {
          tenantId: context.tenantId,
          activeVertical: context.activeVertical,
          error,
        },
        'reflag evaluation failed'
      );

      return {
        overrides: null,
        failureReason: error instanceof Error ? error.message : 'reflag_unknown_error',
      };
    }
  }

  private async ensureInitialized() {
    if (!this.client) {
      return;
    }

    if (!this.initializationPromise) {
      this.initializationPromise = this.client.initialize();
    }

    await this.initializationPromise;
  }
}
