import { and, eq } from 'drizzle-orm';
import { appointments, db, patientIdentities, patients } from '@agentmou/db';

import type { ReceptionistToolDefinition, ReceptionistToolHandlerContext } from './registry';

export const agendarVisita: ReceptionistToolDefinition = {
  name: 'agendar_visita',
  description:
    'Agenda una visita confirmada. Solo usar cuando el cliente haya confirmado fecha, hora y motivo.',
  parameters: {
    type: 'object',
    properties: {
      fecha: { type: 'string', description: 'YYYY-MM-DD' },
      hora: { type: 'string', description: 'HH:MM formato 24h' },
      nombre: { type: 'string', description: 'Nombre completo del cliente' },
      telefono: { type: 'string', description: 'Numero de telefono del cliente' },
      motivo: { type: 'string', description: 'Motivo breve de la visita' },
    },
    required: ['fecha', 'hora', 'nombre', 'telefono', 'motivo'],
  },
  async handler(ctx: ReceptionistToolHandlerContext): Promise<string> {
    const { fecha, hora, nombre, telefono, motivo } = ctx.args as Record<string, string>;

    const startsAt = new Date(`${fecha}T${hora}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      return 'Fecha u hora no valida. Usa formato YYYY-MM-DD y HH:MM.';
    }
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    let patient = await findPatientByPhone(ctx.tenantId, telefono);
    if (!patient) {
      const names = (nombre ?? 'Paciente').split(' ');
      const firstName = names[0] ?? 'Paciente';
      const lastName = names.slice(1).join(' ') || '';

      const [created] = await db
        .insert(patients)
        .values({
          tenantId: ctx.tenantId,
          firstName,
          lastName,
          fullName: nombre,
          phone: telefono,
          status: 'new_lead',
          isExisting: false,
          source: 'ai_receptionist',
        })
        .returning();
      patient = created;

      await db.insert(patientIdentities).values({
        tenantId: ctx.tenantId,
        patientId: created.id,
        identityType: 'phone',
        identityValue: telefono,
        isPrimary: true,
        confidenceScore: 1,
      });
    }

    const [appointment] = await db
      .insert(appointments)
      .values({
        tenantId: ctx.tenantId,
        patientId: patient.id,
        status: 'scheduled',
        source: 'whatsapp',
        startsAt,
        endsAt,
        bookedAt: new Date(),
        confirmationStatus: 'pending',
        reminderStatus: 'pending',
        metadata: { motivo, bookedByAi: true },
      })
      .returning();

    const dateLabel = startsAt.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return `Visita agendada correctamente para ${dateLabel} a las ${hora}. Paciente: ${nombre}. ID: ${appointment.id.slice(0, 8)}. Se enviara recordatorio 24h antes.`;
  },
};

async function findPatientByPhone(tenantId: string, phone: string) {
  const [row] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.tenantId, tenantId), eq(patients.phone, phone)))
    .limit(1);
  return row ?? null;
}
