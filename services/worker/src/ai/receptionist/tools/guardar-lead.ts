import { db, patients, patientIdentities } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';
import type { ToolDefinition, ToolHandlerContext } from './registry.js';

export const guardarLead: ToolDefinition = {
  name: 'guardar_lead',
  description:
    'Guarda o actualiza un lead/paciente. Usar cuando detectes un nuevo contacto o nueva informacion de uno existente.',
  parameters: {
    type: 'object',
    properties: {
      nombre: { type: 'string', description: 'Nombre completo' },
      telefono: { type: 'string', description: 'Telefono' },
      email: { type: 'string', description: 'Email (opcional)' },
      servicio_interes: { type: 'string', description: 'Que servicio le interesa' },
      notas: { type: 'string', description: 'Notas relevantes del contacto' },
      canal_origen: { type: 'string', description: 'whatsapp, telefono, o web' },
    },
    required: ['nombre', 'telefono', 'canal_origen'],
  },
  async handler(ctx: ToolHandlerContext): Promise<string> {
    const { nombre, telefono, email, servicio_interes, notas, canal_origen } = ctx.args as Record<
      string,
      string | undefined
    >;

    const [existing] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.tenantId, ctx.tenantId), eq(patients.phone, telefono ?? '')))
      .limit(1);

    if (existing) {
      await db
        .update(patients)
        .set({
          notes: [existing.notes, notas].filter(Boolean).join(' | '),
          email: email ?? existing.email,
          lastInteractionAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(patients.id, existing.id));
      return 'Lead actualizado correctamente.';
    }

    const names = (nombre ?? 'Lead').split(' ');
    const firstName = names[0] ?? 'Lead';
    const lastName = names.slice(1).join(' ') || '';

    const [created] = await db
      .insert(patients)
      .values({
        tenantId: ctx.tenantId,
        firstName,
        lastName,
        fullName: nombre ?? 'Lead',
        phone: telefono,
        email: email ?? null,
        status: 'new_lead',
        isExisting: false,
        source: canal_origen ?? 'whatsapp',
        notes: [servicio_interes ? `Interes: ${servicio_interes}` : '', notas]
          .filter(Boolean)
          .join(' | ') || null,
        lastInteractionAt: new Date(),
      })
      .returning();

    if (telefono) {
      await db.insert(patientIdentities).values({
        tenantId: ctx.tenantId,
        patientId: created.id,
        identityType: 'phone',
        identityValue: telefono,
        isPrimary: true,
        confidenceScore: 1,
      });
    }

    return 'Lead guardado correctamente.';
  },
};
