import type { ToolDefinition, ToolHandlerContext } from './registry.js';

export const consultarFaq: ToolDefinition = {
  name: 'consultar_faq',
  description:
    'Busca en la base de conocimiento para responder preguntas sobre servicios, procesos, materiales, garantias, etc.',
  parameters: {
    type: 'object',
    properties: {
      pregunta: {
        type: 'string',
        description: 'La pregunta del cliente en lenguaje natural',
      },
    },
    required: ['pregunta'],
  },
  async handler(_ctx: ToolHandlerContext): Promise<string> {
    // Phase 1: placeholder response. RAG with pgvector (clinic_knowledge_chunks)
    // is deferred to Phase 1.1 behind the knowledgeBaseEnabled flag.
    return 'No encontre informacion especifica sobre eso. Recomiendo que el cliente contacte directamente con el equipo para mas detalles.';
  },
};
