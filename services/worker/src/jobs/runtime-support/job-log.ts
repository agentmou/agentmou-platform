import type { Job } from 'bullmq';
import {
  createServiceLogger,
  isTestEnvironment,
} from '@agentmou/observability';

const logger = createServiceLogger('worker');

export async function logJobMessage<T>(job: Job<T>, message: string) {
  if (typeof job.log === 'function') {
    await job.log(message);
    return;
  }

  if (!isTestEnvironment()) {
    logger.warn(message);
  }
}

export function logRuntimeMessage(message: string) {
  if (!isTestEnvironment()) {
    logger.info(message);
  }
}

export function warnRuntimeMessage(message: string) {
  if (!isTestEnvironment()) {
    logger.warn(message);
  }
}

export function errorRuntimeMessage(message: string, error?: unknown) {
  if (!isTestEnvironment()) {
    logger.error({ err: error }, message);
  }
}
