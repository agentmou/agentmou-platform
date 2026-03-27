import type { Job } from 'bullmq';
import { createChildLogger } from '@agentmou/observability';

const logger = createChildLogger({ service: 'worker' });

export async function logJobMessage<T>(job: Job<T>, message: string) {
  if (typeof job.log === 'function') {
    await job.log(message);
    return;
  }

  if (process.env.NODE_ENV !== 'test') {
    logger.warn(message);
  }
}

export function logRuntimeMessage(message: string) {
  if (process.env.NODE_ENV !== 'test') {
    logger.info(message);
  }
}

export function warnRuntimeMessage(message: string) {
  if (process.env.NODE_ENV !== 'test') {
    logger.warn(message);
  }
}

export function errorRuntimeMessage(message: string, error?: unknown) {
  if (process.env.NODE_ENV !== 'test') {
    logger.error({ err: error }, message);
  }
}
