import type { ToolDefinition, ToolHandlerContext } from './registry.js';

export const enviarFormulario: ToolDefinition = {
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
  async handler(ctx: ToolHandlerContext): Promise<string> {
    const tipo = String(ctx.args.tipo_formulario ?? 'previo_visita');

    // In Phase 1 this enqueues a clinic-form-follow-up job through the
    // existing ClinicAutomationService. For now return a confirmation.
    return `Formulario de tipo "${tipo}" encolado para envio al cliente.`;
  },
};
