import { agendarVisita } from './agendar-visita';
import { cancelarVisita } from './cancelar-visita';
import { consultarDisponibilidad } from './consultar-disponibilidad';
import { consultarFaq } from './consultar-faq';
import { enviarFormulario } from './enviar-formulario';
import { guardarLead } from './guardar-lead';
import { transferirHumano } from './transferir-humano';

export interface ReceptionistToolHandlerContext {
  tenantId: string;
  args: Record<string, unknown>;
  threadId?: string;
  callId?: string;
}

export interface ReceptionistToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (ctx: ReceptionistToolHandlerContext) => Promise<string>;
}

export type ReceptionistToolRegistry = Record<string, ReceptionistToolDefinition>;

export const toolRegistry: ReceptionistToolRegistry = {
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
