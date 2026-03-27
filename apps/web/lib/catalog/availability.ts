import type { Availability } from '@agentmou/contracts';
import { DEFAULT_OPERATIONAL_LISTING_AVAILABILITY } from '@agentmou/contracts';

/**
 * Resolves catalog listing tier when templates omit `availability` (treat as preview, not GA).
 */
export function resolveCatalogAvailability(availability: Availability | undefined): Availability {
  return availability ?? DEFAULT_OPERATIONAL_LISTING_AVAILABILITY;
}
