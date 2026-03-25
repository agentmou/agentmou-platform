/**
 * Worker Service — processes background jobs via BullMQ.
 *
 * Each queue has a dedicated Worker instance. Job processors are imported
 * from the jobs/ directory.
 */

import { Worker, type Job } from 'bullmq';
import {
  getConnectionOptions,
  QUEUE_NAMES,
  type InternalWorkOrderPayload,
  type InstallPackPayload,
  type RunAgentPayload,
  type RunWorkflowPayload,
  type ScheduleTriggerPayload,
} from '@agentmou/queue';
import { processInstallPack, processRunAgent, processRunWorkflow, processScheduleTrigger, processApprovalTimeout, processInternalWorkOrder, type ApprovalTimeoutPayload } from './jobs';

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

const workers = [
  startWorker<InstallPackPayload>(QUEUE_NAMES.INSTALL_PACK, processInstallPack),
  startWorker<RunAgentPayload>(QUEUE_NAMES.RUN_AGENT, processRunAgent),
  startWorker<RunWorkflowPayload>(QUEUE_NAMES.RUN_WORKFLOW, processRunWorkflow),
  startWorker<ScheduleTriggerPayload>(QUEUE_NAMES.SCHEDULE_TRIGGER, processScheduleTrigger),
  startWorker<ApprovalTimeoutPayload>(QUEUE_NAMES.APPROVAL_TIMEOUT, processApprovalTimeout),
  startWorker<InternalWorkOrderPayload>(QUEUE_NAMES.INTERNAL_WORK_ORDER, processInternalWorkOrder),
];

async function shutdown() {
  console.log('Shutting down workers...');
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log(`AgentMou Worker started with ${workers.length} queue(s)`);
