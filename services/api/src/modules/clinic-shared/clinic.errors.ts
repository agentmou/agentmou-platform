import type { FastifyReply } from 'fastify';
import type {
  ChannelType,
  ClinicFeatureUnavailableError,
  ClinicFeatureUnavailableReason,
  ModuleKey,
} from '@agentmou/contracts';

export class ClinicRouteError extends Error {
  constructor(
    public statusCode: number,
    public body: Record<string, unknown>
  ) {
    super(typeof body.error === 'string' ? body.error : 'Clinic route error');
    this.name = 'ClinicRouteError';
  }
}

export class ClinicFeatureUnavailableRouteError extends ClinicRouteError {
  constructor(input: {
    reason: ClinicFeatureUnavailableReason;
    moduleKey?: ModuleKey;
    channelType?: ChannelType;
    detail?: string;
  }) {
    const payload: ClinicFeatureUnavailableError = {
      error: 'Clinic feature unavailable',
      code: 'clinic_feature_unavailable',
      reason: input.reason,
      moduleKey: input.moduleKey,
      channelType: input.channelType,
      detail: input.detail,
    };

    super(409, payload);
    this.name = 'ClinicFeatureUnavailableRouteError';
  }
}

export class ClinicForbiddenRouteError extends ClinicRouteError {
  constructor(message = 'Forbidden') {
    super(403, { error: message });
    this.name = 'ClinicForbiddenRouteError';
  }
}

export function handleClinicRouteError(reply: FastifyReply, error: unknown) {
  if (error instanceof ClinicRouteError) {
    return reply.status(error.statusCode).send(error.body);
  }

  throw error;
}
