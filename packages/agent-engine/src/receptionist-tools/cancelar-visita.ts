import { and, eq } from 'drizzle-orm';
import { appointments, db, patients } from '@agentmou/db';

import type { ReceptionistToolDefinition, ReceptionistToolHandlerContext } from './registry';

export const cancelarVisita: ReceptionistToolDefinition = {
  name: 'cancelar_visita',
  description:
    'Cancela una visita existente. Busca por telefono del cliente. Solo usar cuando el cliente confirme.',
  parameters: {
    type: 'object',
    properties: {
      telefono: { type: 'string', description: 'Telefono del cliente para buscar su cita' },
      motivo_cancelacion: { type: 'string', description: 'Motivo de la cancelacion' },
    },
    required: ['telefono'],
  },
  async handler(ctx: ReceptionistToolHandlerContext): Promise<string> {
    const telefono = String(ctx.args.telefono ?? '');
    const motivo = String(ctx.args.motivo_cancelacion ?? '');

    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.tenantId, ctx.tenantId), eq(patients.phone, telefono)))
      .limit(1);

    if (!patient) {
      return 'No encontre ningun paciente con ese telefono.';
    }

    const [appointment] = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, ctx.tenantId),
          eq(appointments.patientId, patient.id),
          eq(appointments.status, 'scheduled')
        )
      )
      .limit(1);

    if (!appointment) {
      return 'No encontre ninguna visita pendiente para ese paciente.';
    }

    await db
      .update(appointments)
      .set({
        status: 'cancelled',
        cancellationReason: motivo || 'Cancelada por solicitud del paciente via IA',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointment.id));

    const dateLabel = appointment.startsAt.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    return `Visita del ${dateLabel} cancelada correctamente.`;
  },
};
