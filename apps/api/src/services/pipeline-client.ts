/**
 * Pipeline client: enqueues analysis jobs into BullMQ for the ML pipeline.
 *
 * In Phase 2 the ML pipeline runs as a separate Python process that drains
 * the queue. This file is the API->ML boundary.
 */
import { Queue } from "bullmq";
import IORedis from "ioredis";

let _queue: Queue | null = null;
let _conn: IORedis | null = null;

function getQueue(): Queue {
  if (_queue) return _queue;
  _conn = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
  _queue = new Queue("sybilshield-analyses", { connection: _conn });
  return _queue;
}

export interface AnalysisJob {
  analysisId: string;
  addresses: string[];
  addressesFileUrl?: string;
  chains: string[];
  sensitivity: string;
}

export async function enqueueAnalysis(job: AnalysisJob): Promise<void> {
  if (process.env.USE_MOCK_PROVIDERS === "true") {
    // In mock mode we run inline; useful for local tests without redis.
    return;
  }
  const q = getQueue();
  await q.add("analyze", job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  });
}

export async function shutdown(): Promise<void> {
  if (_queue) await _queue.close();
  if (_conn) await _conn.quit();
  _queue = null;
  _conn = null;
}
