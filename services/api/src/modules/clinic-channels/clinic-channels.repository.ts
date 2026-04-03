import { clinicChannels, db } from '@agentmou/db';
import { and, eq } from 'drizzle-orm';

type DatabaseClient = typeof db;

export class ClinicChannelsRepository {
  constructor(private readonly database: DatabaseClient = db) {}

  async listChannels(tenantId: string) {
    return this.database
      .select()
      .from(clinicChannels)
      .where(eq(clinicChannels.tenantId, tenantId));
  }

  async getPrimaryChannel(tenantId: string, channelType: string) {
    const channels = await this.database
      .select()
      .from(clinicChannels)
      .where(and(eq(clinicChannels.tenantId, tenantId), eq(clinicChannels.channelType, channelType)));

    if (channels.length === 0) {
      return null;
    }

    return (
      channels.find((channel) => channel.status === 'active') ??
      [...channels].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0] ??
      null
    );
  }

  async updateChannel(
    tenantId: string,
    channelType: string,
    data: Partial<typeof clinicChannels.$inferInsert>
  ) {
    const channel = await this.getPrimaryChannel(tenantId, channelType);
    if (!channel) {
      return null;
    }

    const [updated] = await this.database
      .update(clinicChannels)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(clinicChannels.id, channel.id))
      .returning();

    return updated ?? null;
  }
}
