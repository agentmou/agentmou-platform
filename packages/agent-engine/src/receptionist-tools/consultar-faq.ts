import type { ReceptionistToolDefinition, ReceptionistToolHandlerContext } from './registry';

export const consultarFaq: ReceptionistToolDefinition = {
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
  async handler(_ctx: ReceptionistToolHandlerContext): Promise<string> {
    return 'No encontre informacion especifica sobre eso. Recomiendo que el cliente contacte directamente con el equipo para mas detalles.';
  },
};
