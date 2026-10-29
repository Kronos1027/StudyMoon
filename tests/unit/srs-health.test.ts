import { describe, expect, it } from "vitest";
import { assessSrsBacklog } from "@/lib/srs/health";

const now = new Date("2026-10-29T15:00:00.000Z");
const minutesAgo = (minutes: number) =>
  new Date(now.getTime() - minutes * 60_000).toISOString();

describe("FSRS backlog monitoring", () => {
  it("marks an empty queue as clear", () => {
    expect(assessSrsBacklog({
      pending: 0, retried: 0, oldestAttemptedAt: null,
    }, now)).toEqual({
      pending: 0, retried: 0, oldestAgeMinutes: null, status: "clear",
    });
  });

  it("does not report a fresh non-retried backlog as unhealthy", () => {
    expect(assessSrsBacklog({
      pending: 25, retried: 0, oldestAttemptedAt: minutesAgo(12),
    }, now).status).toBe("normal");
  });

  it("warns at the hour mark", () => {
    expect(assessSrsBacklog({
      pending: 3, retried: 0, oldestAttemptedAt: minutesAgo(59),
    }, now).status).toBe("normal");
    expect(assessSrsBacklog({
      pending: 3, retried: 0, oldestAttemptedAt: minutesAgo(60),
    }, now).status).toBe("delayed");
  });

  it("raises the severe signal for 6-hour-old pending attempts", () => {
    expect(assessSrsBacklog({
      pending: 1, retried: 0, oldestAttemptedAt: minutesAgo(360),
    }, now)).toMatchObject({
      oldestAgeMinutes: 360, status: "stale",
    });
  });

  it("warns even for a recent event if it already required retries", () => {
    expect(assessSrsBacklog({
      pending: 2, retried: 1, oldestAttemptedAt: minutesAgo(2),
    }, now).status).toBe("delayed");
  });

  it("treats missing/invalid timestamps as operational faults", () => {
    expect(assessSrsBacklog({
      pending: 2, retried: 0, oldestAttemptedAt: null,
    }, now).status).toBe("stale");
    expect(assessSrsBacklog({
      pending: 1, retried: 0, oldestAttemptedAt: "invalid",
    }, now).status).toBe("stale");
  });

  it("does not expose identifiers and guards against clock skew", () => {
    expect(assessSrsBacklog({
      pending: 1, retried: 900,
      oldestAttemptedAt: minutesAgo(-10),
    }, now)).toEqual({
      pending: 1, retried: 1, oldestAgeMinutes: 0, status: "delayed",
    });
  });
});
