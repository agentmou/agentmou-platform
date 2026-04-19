export interface ToolHandlerContext {
  tenantId: string;
  args: Record<string, unknown>;
  threadId?: string;
  callId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (ctx: ToolHandlerContext) => Promise<string>;
}

export type ToolRegistry = Record<string, ToolDefinition>;

import { agendarVisita } from './agendar-visita.js';
import { cancelarVisita } from './cancelar-visita.js';
import { consultarDisponibilidad } from './consultar-disponibilidad.js';
import { consultarFaq } from './consultar-faq.js';
import { enviarFormulario } from './enviar-formulario.js';
import { guardarLead } from './guardar-lead.js';
import { transferirHumano } from './transferir-humano.js';

export const toolRegistry: ToolRegistry = {
  agendar_visita: agendarVisita,
  cancelar_visita: cancelarVisita,
  consultar_disponibilidad: consultarDisponibilidad,
  consultar_faq: consultarFaq,
  enviar_formulario: enviarFormulario,
  guardar_lead: guardarLead,
  transferir_humano: transferirHumano,
};

export function getOpenAiToolDefinitions() {
  return Object.values(toolRegistry).map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
