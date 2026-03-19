import { z } from 'zod';

export const PublicChatRoleSchema = z.enum(['user', 'assistant']);
export type PublicChatRole = z.infer<typeof PublicChatRoleSchema>;

export const PublicChatMessageSchema = z.object({
  role: PublicChatRoleSchema,
  content: z.string().min(1),
});

export type PublicChatMessage = z.infer<typeof PublicChatMessageSchema>;

export const PublicChatCitationSchema = z.object({
  id: z.string(),
  title: z.string(),
  href: z.string(),
  excerpt: z.string(),
  sourcePath: z.string(),
});

export type PublicChatCitation = z.infer<typeof PublicChatCitationSchema>;

export const PublicChatActionSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export type PublicChatAction = z.infer<typeof PublicChatActionSchema>;

export const PublicChatRequestSchema = z.object({
  messages: z.array(PublicChatMessageSchema).min(1),
  sessionId: z.string().optional(),
});

export type PublicChatRequest = z.infer<typeof PublicChatRequestSchema>;

export const PublicChatResponseSchema = z.object({
  reply: z.string(),
  citations: z.array(PublicChatCitationSchema),
  actions: z.array(PublicChatActionSchema).default([]),
  provider: z.enum(['retrieval', 'n8n']),
  fallback: z.boolean(),
});

export type PublicChatResponse = z.infer<typeof PublicChatResponseSchema>;
