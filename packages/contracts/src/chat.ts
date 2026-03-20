import { z } from 'zod';

/** Allowed roles for public chat messages. */
export const PublicChatRoleSchema = z.enum(['user', 'assistant']);

/** TypeScript view of the allowed public chat roles. */
export type PublicChatRole = z.infer<typeof PublicChatRoleSchema>;

/** Contract for a single message in the public chat request history. */
export const PublicChatMessageSchema = z.object({
  role: PublicChatRoleSchema,
  content: z.string().min(1),
});

/** TypeScript shape for a public chat message. */
export type PublicChatMessage = z.infer<typeof PublicChatMessageSchema>;

/** Citation payload returned when the public chat service references a source. */
export const PublicChatCitationSchema = z.object({
  id: z.string(),
  title: z.string(),
  href: z.string(),
  excerpt: z.string(),
  sourcePath: z.string(),
});

/** TypeScript shape for a public chat citation. */
export type PublicChatCitation = z.infer<typeof PublicChatCitationSchema>;

/** Follow-up action surfaced alongside a public chat response. */
export const PublicChatActionSchema = z.object({
  label: z.string(),
  href: z.string(),
});

/** TypeScript shape for a public chat action. */
export type PublicChatAction = z.infer<typeof PublicChatActionSchema>;

/** Request payload accepted by the public chat route. */
export const PublicChatRequestSchema = z.object({
  messages: z.array(PublicChatMessageSchema).min(1),
  sessionId: z.string().optional(),
});

/** TypeScript shape for a public chat request. */
export type PublicChatRequest = z.infer<typeof PublicChatRequestSchema>;

/** Response payload returned by the public chat route. */
export const PublicChatResponseSchema = z.object({
  reply: z.string(),
  citations: z.array(PublicChatCitationSchema),
  actions: z.array(PublicChatActionSchema).default([]),
  provider: z.enum(['retrieval', 'n8n']),
  fallback: z.boolean(),
});

/** TypeScript shape for a public chat response. */
export type PublicChatResponse = z.infer<typeof PublicChatResponseSchema>;
