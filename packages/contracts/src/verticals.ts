import { z } from 'zod';

/** Canonical product verticals that a tenant can activate. */
export const VerticalKeySchema = z.enum(['internal', 'clinic', 'fisio']);

/** TypeScript view of supported tenant verticals. */
export type VerticalKey = z.infer<typeof VerticalKeySchema>;
