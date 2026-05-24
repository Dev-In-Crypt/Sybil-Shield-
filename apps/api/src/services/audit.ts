/**
 * Audit log writer for evidence_audit_log.
 *
 * Every scoring event, appeal, review, or reversal MUST go through this
 * service. The audit trail is the legal defensibility layer described in
 * the project description's Risks section.
 */
import { db, evidenceAuditLog } from "../db/index.js";

export type AuditEventType =
  | "flagged"
  | "appealed"
  | "reviewed"
  | "reversed"
  | "confirmed";

export interface AuditEvent {
  analysisId: string;
  address: string;
  chain: string;
  eventType: AuditEventType;
  actor: string;
  priorScore?: number;
  newScore?: number;
  reason?: string;
  evidenceSnapshot?: unknown;
}

export async function writeAudit(event: AuditEvent): Promise<void> {
  await db.insert(evidenceAuditLog).values({
    analysisId: event.analysisId,
    address: event.address.toLowerCase(),
    chain: event.chain,
    eventType: event.eventType,
    actor: event.actor,
    priorScore: event.priorScore,
    newScore: event.newScore,
    reason: event.reason,
    evidenceSnapshot: event.evidenceSnapshot ?? null,
  });
}

export async function writeAuditBatch(events: AuditEvent[]): Promise<void> {
  if (events.length === 0) return;
  await db.insert(evidenceAuditLog).values(
    events.map((e) => ({
      analysisId: e.analysisId,
      address: e.address.toLowerCase(),
      chain: e.chain,
      eventType: e.eventType,
      actor: e.actor,
      priorScore: e.priorScore,
      newScore: e.newScore,
      reason: e.reason,
      evidenceSnapshot: e.evidenceSnapshot ?? null,
    })),
  );
}

const VERDICT_TO_EVENT: Record<string, AuditEventType> = {
  false_positive: "appealed",
  false_negative: "appealed",
  confirmed: "confirmed",
};

export function verdictToEventType(verdict: string): AuditEventType {
  return VERDICT_TO_EVENT[verdict] ?? "reviewed";
}
