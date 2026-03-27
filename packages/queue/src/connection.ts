import { Queue, type ConnectionOptions } from 'bullmq';
import { getRedisUrl } from './config';

let _connectionOpts: ConnectionOptions | null = null;

/**
 * Returns shared Redis connection options for BullMQ.
 * Uses the validated REDIS_URL env var or a stable test URL during Vitest runs.
 */
export function getConnectionOptions(): ConnectionOptions {
  if (!_connectionOpts) {
    const url = getRedisUrl();
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
