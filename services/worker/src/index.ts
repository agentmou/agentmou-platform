/**
 * Worker Service — processes background jobs via BullMQ.
 *
 * Each queue has a dedicated Worker instance. Job processors are imported
 * from the jobs/ directory.
 */

import { Worker, type Job } from 'bullmq';
import { createServiceLogger } from '@agentmou/observability';
import {
  getConnectionOptions,
  QUEUE_NAMES,
  type InstallPackPayload,
  type RunAgentPayload,
  type RunWorkflowPayload,
  type ScheduleTriggerPayload,
} from '@agentmou/queue';
import {
  processInstallPack,
  processRunAgent,
  processRunWorkflow,
  processScheduleTrigger,
  processApprovalTimeout,
  type ApprovalTimeoutPayload,
} from './jobs';

const connection = getConnectionOptions();
const logger = createServiceLogger('worker');

function startWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
) {
  const worker = new Worker<T>(queueName, processor, { connection });

  worker.on('completed', (job) => {
    logger.info(`[${queueName}] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(err, `[${queueName}] Job ${job?.id} failed`);
  });

  logger.info(`Worker listening on queue: ${queueName}`);
  return worker;
}

const workers = [
  startWorker<InstallPackPayload>(QUEUE_NAMES.INSTALL_PACK, processInstallPack),
  startWorker<RunAgentPayload>(QUEUE_NAMES.RUN_AGENT, processRunAgent),
  startWorker<RunWorkflowPayload>(QUEUE_NAMES.RUN_WORKFLOW, processRunWorkflow),
  startWorker<ScheduleTriggerPayload>(QUEUE_NAMES.SCHEDULE_TRIGGER, processScheduleTrigger),
  startWorker<ApprovalTimeoutPayload>(QUEUE_NAMES.APPROVAL_TIMEOUT, processApprovalTimeout),
];

async function shutdown() {
  logger.info('Shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info(`Agentmou Worker started with ${workers.length} queue(s)`);
