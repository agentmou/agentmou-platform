import {
  db,
  clinicProfiles,
  clinicAiConfigs,
  patients,
  conversationMessages,
  appointments,
} from '@agentmou/db';
import { eq, and, desc, gte } from 'drizzle-orm';

export interface ReceptionistContext {
  tenantId: string;
  threadId: string;
  clinicName: string;
  specialty: string | null;
  timezone: string;
  businessHoursSummary: string;
  patientName: string | null;
  patientId: string | null;
  isExistingPatient: boolean;
  availableSlotsSummary: string;
  persona: string | null;
  modelWhatsapp: string;
  modelVoice: string;
  aiEnabled: boolean;
  dailyTokenBudget: number;
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function loadReceptionistContext(params: {
  tenantId: string;
  threadId: string;
  patientId?: string | null;
  messageWindowSize?: number;
}): Promise<ReceptionistContext> {
  const windowSize = params.messageWindowSize ?? 10;

  const [profile] = await db
    .select()
    .from(clinicProfiles)
    .where(eq(clinicProfiles.tenantId, params.tenantId))
    .limit(1);

  const [aiConfig] = await db
    .select()
    .from(clinicAiConfigs)
    .where(eq(clinicAiConfigs.tenantId, params.tenantId))
    .limit(1);

  let patientName: string | null = null;
  let isExistingPatient = false;
  if (params.patientId) {
    const [patient] = await db
      .select({ fullName: patients.fullName, isExisting: patients.isExisting })
      .from(patients)
      .where(eq(patients.id, params.patientId))
      .limit(1);
    if (patient) {
      patientName = patient.fullName;
      isExistingPatient = patient.isExisting;
    }
  }

  const messages = await db
    .select({
      direction: conversationMessages.direction,
      body: conversationMessages.body,
    })
    .from(conversationMessages)
    .where(eq(conversationMessages.threadId, params.threadId))
    .orderBy(desc(conversationMessages.createdAt))
    .limit(windowSize);

  const recentMessages = messages.reverse().map((m) => ({
    role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.body,
  }));

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = await db
    .select({ startsAt: appointments.startsAt })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, params.tenantId),
        gte(appointments.startsAt, now),
      )
    )
    .orderBy(appointments.startsAt)
    .limit(20);

  const busyHours = new Set(upcoming.map((a) => a.startsAt.toISOString().slice(0, 13)));
  const slotLines: string[] = [];
  const cursor = new Date(now);
  cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
  while (cursor < weekAhead && slotLines.length < 6) {
    const h = cursor.getHours();
    if (h >= 9 && h < 18 && cursor.getDay() >= 1 && cursor.getDay() <= 5) {
      if (!busyHours.has(cursor.toISOString().slice(0, 13))) {
        const day = cursor.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
        slotLines.push(`${day} ${String(h).padStart(2, '0')}:00`);
      }
    }
    cursor.setHours(cursor.getHours() + 1);
  }

  const bh = profile?.businessHours as Record<string, Array<{ start: string; end: string }>> | null;
  let businessHoursSummary = 'No configurado';
  if (bh && typeof bh === 'object') {
    const days = Object.entries(bh)
      .filter(([, windows]) => Array.isArray(windows) && windows.length > 0)
      .map(([day, windows]) => `${day}: ${(windows as Array<{start:string;end:string}>).map((w) => `${w.start}-${w.end}`).join(', ')}`)
      .join('; ');
    if (days) businessHoursSummary = days;
  }

  return {
    tenantId: params.tenantId,
    threadId: params.threadId,
    clinicName: profile?.displayName ?? 'Clinica',
    specialty: profile?.specialty ?? null,
    timezone: profile?.timezone ?? 'Europe/Madrid',
    businessHoursSummary,
    patientName,
    patientId: params.patientId ?? null,
    isExistingPatient,
    availableSlotsSummary: slotLines.length
      ? `Proximos huecos:\n${slotLines.join('\n')}`
      : '',
    persona: (aiConfig?.persona as string) ?? null,
    modelWhatsapp: aiConfig?.modelWhatsapp ?? 'gpt-4.1-mini',
    modelVoice: aiConfig?.modelVoice ?? 'gpt-4.1-mini',
    aiEnabled: aiConfig?.enabled ?? false,
    dailyTokenBudget: aiConfig?.dailyTokenBudget ?? 500000,
    recentMessages,
  };
}
