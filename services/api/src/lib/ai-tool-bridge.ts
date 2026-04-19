import { toolRegistry } from '@agentmou/agent-engine';

export interface ExecuteToolInput {
  tenantId: string;
  toolName: string;
  args: Record<string, unknown>;
  callId?: string;
}

export async function executeReceptionistTool(input: ExecuteToolInput): Promise<string> {
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
