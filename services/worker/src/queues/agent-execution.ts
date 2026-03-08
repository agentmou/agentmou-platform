import { Queue, Worker, Job } from 'bullmq';

export interface AgentExecutionJob {
  agentId: string;
  triggerType: 'schedule' | 'webhook' | 'manual';
  payload?: Record<string, unknown>;
}

export class AgentExecutionQueue {
  private queue: Queue;
  private worker: Worker;

  constructor(connection: { host: string; port: number }) {
    this.queue = new Queue('agent-execution', { connection });
    
    this.worker = new Worker('agent-execution', async (job: Job<AgentExecutionJob>) => {
      await this.processAgentExecution(job.data);
    }, { connection });
  }

  private async processAgentExecution(jobData: AgentExecutionJob) {
    console.log(`Executing agent ${jobData.agentId} via ${jobData.triggerType}`);
    // Implementation here
  }

  async addAgentJob(jobData: AgentExecutionJob) {
    return this.queue.add('execute-agent', jobData);
  }

  async getQueueStats() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  async close() {
    await this.queue.close();
    await this.worker.close();
  }
}
