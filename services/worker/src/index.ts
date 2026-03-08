/**
 * Worker Service — processes background jobs via BullMQ.
 *
 * Each queue has a dedicated Worker instance. Job processors are imported
 * from the jobs/ directory.
 */

import { Worker, type Job } from 'bullmq';
import { getConnectionOptions, QUEUE_NAMES, type InstallPackPayload } from '@agentmou/queue';
import { processInstallPack } from './jobs/install-pack/install-pack.job';

const connection = getConnectionOptions();

function startWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
) {
  const worker = new Worker<T>(queueName, processor, { connection });

  worker.on('completed', (job) => {
    console.log(`[${queueName}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[${queueName}] Job ${job?.id} failed:`, err.message);
  });

  console.log(`Worker listening on queue: ${queueName}`);
  return worker;
}

// Start workers for implemented queues
const workers = [
  startWorker<InstallPackPayload>(QUEUE_NAMES.INSTALL_PACK, processInstallPack),
];

async function shutdown() {
  console.log('Shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log(`AgentMou Worker started with ${workers.length} queue(s)`);
