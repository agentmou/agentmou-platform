import type { Job } from 'bullmq';

export async function logJobMessage<T>(job: Job<T>, message: string) {
  if (typeof job.log === 'function') {
    await job.log(message);
    return;
  }

  console.warn(message);
}
