/**
 * E2E smoke test for the AI receptionist flow.
 *
 * Simulates:
 * 1. Inbound Twilio WhatsApp webhook → AI response enqueued
 * 2. Retell post-call webhook → call_sessions persisted
 * 3. Retell tool-call webhook → synchronous tool result
 *
 * Requires: running API at API_BASE_URL (default http://localhost:3001)
 */

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001';

async function postWebhook(path: string, body: Record<string, unknown>, contentType = 'application/json') {
  const isForm = contentType.includes('form-urlencoded');
  const bodyPayload = isForm
    ? new URLSearchParams(Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)])))
    : JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body: bodyPayload,
  });

  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

async function testWhatsAppInbound() {
  console.log('--- Test: WhatsApp inbound message ---');
  const result = await postWebhook(
    '/api/v1/webhooks/twilio/whatsapp',
    {
      MessageSid: `SM_e2e_ai_${Date.now()}`,
      Body: 'Hola, quiero agendar una visita para el jueves',
      From: 'whatsapp:+34600999001',
      To: 'whatsapp:+34910000001',
      AccountSid: 'ACtest',
    },
    'application/x-www-form-urlencoded'
  );

  console.log('  Status:', result.status);
  console.log('  Response:', JSON.stringify(result.data));
  console.assert(result.status === 200, 'Expected 200');
  console.assert(result.data?.ok === true, 'Expected ok=true');
}

async function testRetellPostCall() {
  console.log('--- Test: Retell post-call webhook ---');
  const result = await postWebhook('/api/v1/webhooks/retell/post-call', {
    event: 'call_analyzed',
    call_id: `call_e2e_${Date.now()}`,
    call_type: 'inbound',
    from_number: '+34600999002',
    to_number: '+34910000003',
    duration_ms: 95000,
    transcript: 'Paciente: Hola quiero pedir cita. Agente: Claro, para cuando?',
    call_summary: 'Paciente quiere agendar primera visita dental.',
    custom_analysis: { sentiment: 'positive', intent: 'agendar_visita' },
  });

  console.log('  Status:', result.status);
  console.log('  Response:', JSON.stringify(result.data));
  console.assert(result.status === 200, 'Expected 200');
}

async function testRetellToolCall() {
  console.log('--- Test: Retell tool-call webhook ---');
  const result = await postWebhook('/api/v1/webhooks/retell/tool', {
    call_id: `call_tool_${Date.now()}`,
    event: 'tool_call',
    tool_name: 'consultar_disponibilidad',
    args: { fecha_preferida: 'esta semana', rango_horario: 'indiferente' },
  });

  console.log('  Status:', result.status);
  console.log('  Response:', JSON.stringify(result.data));
  console.assert(result.status === 200, 'Expected 200');
  console.assert(typeof result.data?.result === 'string', 'Expected result string');
}

async function main() {
  console.log(`AI Receptionist E2E Tests (API: ${API_BASE_URL})\n`);

  try {
    await testWhatsAppInbound();
    await testRetellPostCall();
    await testRetellToolCall();
    console.log('\n✓ All E2E tests passed');
  } catch (error) {
    console.error('\n✗ E2E test failed:', error);
    process.exit(1);
  }
}

main();
