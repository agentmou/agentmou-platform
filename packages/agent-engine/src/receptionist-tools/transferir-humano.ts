import { and, eq } from 'drizzle-orm';
import { conversationThreads, db } from '@agentmou/db';

import type { ReceptionistToolDefinition, ReceptionistToolHandlerContext } from './registry';

export const transferirHumano: ReceptionistToolDefinition = {
  name: 'transferir_humano',
  description:
    'Transfiere la conversacion a un agente humano. Usar cuando el cliente lo pida explicitamente o cuando no puedas resolver la consulta.',
  parameters: {
    type: 'object',
    properties: {
      motivo: { type: 'string', description: 'Motivo de la transferencia' },
      urgencia: { type: 'string', description: 'baja, media, o alta' },
    },
    required: ['motivo'],
  },
  async handler(ctx: ReceptionistToolHandlerContext): Promise<string> {
    if (ctx.threadId) {
      await db
        .update(conversationThreads)
        .set({
          status: 'pending_human',
          requiresHumanReview: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversationThreads.tenantId, ctx.tenantId),
            eq(conversationThreads.id, ctx.threadId)
          )
        );
    }

    return 'He notificado al equipo. Un companero se pondra en contacto lo antes posible.';
  },
};
