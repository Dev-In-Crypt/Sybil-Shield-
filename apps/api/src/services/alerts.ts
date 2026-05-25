/**
 * Lightweight outbound alerts.
 *
 * Used by the worker's runAnalysis() catch-block to ping a Discord webhook
 * when a job blows up — so we hear about queue-stuck / ML-down failures
 * without having to tail container logs. No-op when WORKER_ALERT_WEBHOOK
 * env is unset (which is the default until the operator wires it on the
 * server — see scripts/README.md).
 *
 * The monitor.sh cron handles uptime probes; this module covers the
 * complement: silent worker-internal failures that don't show as a 503
 * on /health.
 */

const WEBHOOK_URL = process.env.WORKER_ALERT_WEBHOOK;

/**
 * Fire-and-forget Discord ping. Swallows network errors — alerts are
 * best-effort, never block the calling code path or change worker
 * retry semantics.
 */
export async function emitAlert(message: string): Promise<void> {
  if (!WEBHOOK_URL) return;
  try {
    const trimmed = message.length > 1900 ? `${message.slice(0, 1900)}…` : message;
    await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: trimmed }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // intentionally swallowed — alerting must never make the actual error worse
  }
}
