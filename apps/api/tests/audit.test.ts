import { describe, expect, it } from "vitest";
import { verdictToEventType, type AuditEvent } from "../src/services/audit.js";

describe("audit service", () => {
  it("maps verdict false_positive -> appealed", () => {
    expect(verdictToEventType("false_positive")).toBe("appealed");
  });

  it("maps verdict confirmed -> confirmed", () => {
    expect(verdictToEventType("confirmed")).toBe("confirmed");
  });

  it("unknown verdict falls back to reviewed", () => {
    expect(verdictToEventType("totally_made_up")).toBe("reviewed");
  });

  it("AuditEvent shape is well-formed", () => {
    // Type-level smoke test - the object must compile against AuditEvent.
    const ev: AuditEvent = {
      analysisId: "00000000-0000-0000-0000-000000000000",
      address: "0x" + "11".repeat(20),
      chain: "ethereum",
      eventType: "flagged",
      actor: "system:test",
      newScore: 85,
    };
    expect(ev.eventType).toBe("flagged");
    expect(ev.address).toMatch(/^0x[0-9a-f]{40}$/);
  });
});
