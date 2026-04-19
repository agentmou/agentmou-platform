/**
 * Bridge module that allows the API to execute AI receptionist tools
 * synchronously (for Retell tool-call webhooks) without importing the
 * full worker orchestrator. The actual tool implementations live in the
 * worker; this module re-uses the shared registry directly.
 */

export interface ExecuteToolInput {
  tenantId: string;
  toolName: string;
  args: Record<string, unknown>;
  callId?: string;
}

export async function executeReceptionistTool(input: ExecuteToolInput): Promise<string> {
  const { toolRegistry } = await import(
    '../../worker/src/ai/receptionist/tools/registry.js'
  ).catch(() => ({ toolRegistry: null }));

  if (!toolRegistry) {
    return 'Herramienta no disponible en este momento.';
  }

  const tool = toolRegistry[input.toolName];
  if (!tool) {
    return `Herramienta "${input.toolName}" no reconocida.`;
  }

  try {
    const result = await tool.handler({
      tenantId: input.tenantId,
      args: input.args,
      callId: input.callId,
    });
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch {
    return 'Error al ejecutar la herramienta.';
  }
}
