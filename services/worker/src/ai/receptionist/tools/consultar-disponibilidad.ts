import { db, appointments } from '@agentmou/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import type { ToolDefinition, ToolHandlerContext } from './registry.js';

export const consultarDisponibilidad: ToolDefinition = {
  name: 'consultar_disponibilidad',
  description:
    'Consulta los huecos disponibles en la agenda para agendar una visita. Úsala cuando el cliente pregunte disponibilidad.',
  parameters: {
    type: 'object',
    properties: {
      fecha_preferida: {
        type: 'string',
        description: 'Fecha preferida (YYYY-MM-DD) o "esta semana" o "proxima semana"',
      },
      rango_horario: {
        type: 'string',
        description: 'mañana (9-13), tarde (15-18), o indiferente',
      },
    },
    required: ['fecha_preferida'],
  },
  async handler(ctx: ToolHandlerContext): Promise<string> {
    const fechaStr = String(ctx.args.fecha_preferida ?? '');
    const now = new Date();

    let start: Date;
    let end: Date;

    if (fechaStr === 'esta semana') {
      start = now;
      end = new Date(now);
      end.setDate(end.getDate() + (5 - end.getDay()));
    } else if (fechaStr === 'proxima semana' || fechaStr === 'próxima semana') {
      start = new Date(now);
      start.setDate(start.getDate() + (8 - start.getDay()));
      end = new Date(start);
      end.setDate(end.getDate() + 4);
    } else {
      start = new Date(fechaStr);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
    }

    if (isNaN(start.getTime())) {
      return 'No pude interpretar la fecha. Por favor indica una fecha valida (YYYY-MM-DD).';
    }

    const existing = await db
      .select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, ctx.tenantId),
          gte(appointments.startsAt, start),
          lte(appointments.startsAt, end)
        )
      );

    const busy = new Set(
      existing.map((a) => `${a.startsAt.toISOString().slice(0, 13)}`)
    );

    const slots: string[] = [];
    const cursor = new Date(start);
    cursor.setHours(9, 0, 0, 0);

    while (cursor < end) {
      const hour = cursor.getHours();
      if (hour >= 9 && hour < 18 && !busy.has(cursor.toISOString().slice(0, 13))) {
        const dayLabel = cursor.toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        });
        const timeLabel = cursor.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        });
        slots.push(`${dayLabel} a las ${timeLabel}`);
      }
      cursor.setHours(cursor.getHours() + 1);
      if (cursor.getHours() === 0) {
        cursor.setHours(9);
      }
    }

    if (slots.length === 0) {
      return 'No hay huecos disponibles para esa fecha. Sugiere al cliente otra fecha.';
    }

    return `Huecos disponibles:\n${slots.slice(0, 8).join('\n')}`;
  },
};
