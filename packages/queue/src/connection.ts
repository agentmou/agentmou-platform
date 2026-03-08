import { Queue, type ConnectionOptions } from 'bullmq';

let _connectionOpts: ConnectionOptions | null = null;

/**
 * Returns shared Redis connection options for BullMQ.
 * Uses REDIS_URL env var or defaults to localhost:6379.
 */
export function getConnectionOptions(): ConnectionOptions {
  if (!_connectionOpts) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const parsed = new URL(url);
    _connectionOpts = {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password || undefined,
    };
  }
  return _connectionOpts;
}

const _queues = new Map<string, Queue>();

/** Get or create a BullMQ Queue by name. */
export function getQueue(name: string): Queue {
  let q = _queues.get(name);
  if (!q) {
    q = new Queue(name, { connection: getConnectionOptions() });
    _queues.set(name, q);
  }
  return q;
}
