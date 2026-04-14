import type { VerticalKey } from '@agentmou/contracts';

import type { FeatureFlagKey } from './catalog.js';

type FeatureFlagOverrideMap = Partial<Record<FeatureFlagKey, boolean>>;

type LocalOverridesDocument =
  | FeatureFlagOverrideMap
  | {
      defaults?: FeatureFlagOverrideMap;
      verticals?: Partial<Record<VerticalKey, FeatureFlagOverrideMap>>;
      tenants?: Record<string, FeatureFlagOverrideMap>;
    };

export interface LocalFallbackContext {
  tenantId: string;
  activeVertical: VerticalKey;
}

export class LocalFallbackProvider {
  private readonly parsedDocument: LocalOverridesDocument | null;

  constructor(private readonly rawOverrides?: string) {
    this.parsedDocument = this.parseDocument(rawOverrides);
  }

  getOverrides(context: LocalFallbackContext): FeatureFlagOverrideMap {
    if (!this.parsedDocument) {
      return {};
    }

    if (!('defaults' in this.parsedDocument) && !('verticals' in this.parsedDocument)) {
      return this.parsedDocument as FeatureFlagOverrideMap;
    }

    return {
      ...(this.parsedDocument.defaults ?? {}),
      ...(this.parsedDocument.verticals?.[context.activeVertical] ?? {}),
      ...(this.parsedDocument.tenants?.[context.tenantId] ?? {}),
    };
  }

  private parseDocument(rawOverrides?: string): LocalOverridesDocument | null {
    if (!rawOverrides) {
      return null;
    }

    try {
      return JSON.parse(rawOverrides) as LocalOverridesDocument;
    } catch {
      return null;
    }
  }
}
