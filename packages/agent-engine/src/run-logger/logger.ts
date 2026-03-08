export interface LogEntry {
  id: string;
  runId: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

export interface RunMetrics {
  runId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  steps: RunStep[];
  totalDuration?: number;
  cost?: number;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
}

export interface RunStep {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  output?: any;
}

export class RunLogger {
  private logs: Map<string, LogEntry[]> = new Map();
  private metrics: Map<string, RunMetrics> = new Map();

  async startRun(runId: string, metadata?: Record<string, any>): Promise<RunMetrics> {
    const runMetrics: RunMetrics = {
      runId,
      startTime: new Date(),
      status: 'running',
      steps: [],
    };

    this.metrics.set(runId, runMetrics);
    await this.log(runId, 'info', `Run started`, metadata);

    return runMetrics;
  }

  async log(
    runId: string,
    level: LogEntry['level'],
    message: string,
    metadata?: Record<string, any>
  ): Promise<LogEntry> {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      runId,
      timestamp: new Date(),
      level,
      message,
      metadata,
    };

    if (!this.logs.has(runId)) {
      this.logs.set(runId, []);
    }
    this.logs.get(runId)!.push(entry);

    return entry;
  }

  async startStep(runId: string, step: Omit<RunStep, 'status' | 'startedAt'>): Promise<RunStep> {
    const metrics = this.metrics.get(runId);
    if (!metrics) {
      throw new Error(`Run ${runId} not found`);
    }

    const newStep: RunStep = {
      ...step,
      status: 'running',
      startedAt: new Date(),
    };

    metrics.steps.push(newStep);
    await this.log(runId, 'info', `Step started: ${step.name}`, { stepId: step.id });

    return newStep;
  }

  async completeStep(
    runId: string,
    stepId: string,
    output?: any
  ): Promise<RunStep | undefined> {
    const metrics = this.metrics.get(runId);
    if (!metrics) return;

    const step = metrics.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'completed';
    step.completedAt = new Date();
    step.duration = step.completedAt.getTime() - step.startedAt!.getTime();
    step.output = output;

    await this.log(runId, 'info', `Step completed: ${step.name}`, {
      stepId,
      duration: step.duration,
    });

    return step;
  }

  async failStep(
    runId: string,
    stepId: string,
    error: string
  ): Promise<RunStep | undefined> {
    const metrics = this.metrics.get(runId);
    if (!metrics) return;

    const step = metrics.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'failed';
    step.completedAt = new Date();
    step.duration = step.completedAt.getTime() - step.startedAt!.getTime();
    step.error = error;

    await this.log(runId, 'error', `Step failed: ${step.name}`, { stepId, error });

    return step;
  }

  async completeRun(runId: string, status: 'completed' | 'failed' | 'cancelled'): Promise<RunMetrics> {
    const metrics = this.metrics.get(runId);
    if (!metrics) {
      throw new Error(`Run ${runId} not found`);
    }

    metrics.endTime = new Date();
    metrics.status = status;
    metrics.totalDuration = metrics.endTime.getTime() - metrics.startTime.getTime();

    await this.log(runId, 'info', `Run ${status}`, {
      duration: metrics.totalDuration,
      stepsCount: metrics.steps.length,
    });

    return metrics;
  }

  async getLogs(runId: string, filters?: { level?: LogEntry['level'] }): Promise<LogEntry[]> {
    const logs = this.logs.get(runId) || [];
    if (filters?.level) {
      return logs.filter(log => log.level === filters.level);
    }
    return logs;
  }

  async getMetrics(runId: string): Promise<RunMetrics | undefined> {
    return this.metrics.get(runId);
  }

  async getActiveRuns(): Promise<RunMetrics[]> {
    return Array.from(this.metrics.values()).filter(m => m.status === 'running');
  }
}
