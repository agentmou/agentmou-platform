import type { ReceptionistToolDefinition, ReceptionistToolHandlerContext } from './registry';

export const enviarFormulario: ReceptionistToolDefinition = {
  name: 'enviar_formulario',
  description:
    'Envia un formulario de recogida de datos al cliente. Util para recoger informacion detallada antes de una visita.',
  parameters: {
    type: 'object',
    properties: {
      telefono: { type: 'string', description: 'Telefono del cliente' },
      tipo_formulario: {
        type: 'string',
        description: 'previo_visita, satisfaccion, o datos_proyecto',
      },
    },
    required: ['telefono', 'tipo_formulario'],
  },
  async handler(ctx: ReceptionistToolHandlerContext): Promise<string> {
    const tipo = String(ctx.args.tipo_formulario ?? 'previo_visita');
    return `Formulario de tipo "${tipo}" encolado para envio al cliente.`;
  },
};
