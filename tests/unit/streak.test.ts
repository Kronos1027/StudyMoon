import { describe, expect, it } from "vitest";
import {
  countsAsStudyDay,
  isoWeekKey,
  updateStreak,
  type StreakState,
} from "@/lib/gamification/streak";

function baseState(overrides: Partial<StreakState> = {}): StreakState {
  return {
    current: 5,
    longest: 7,
    lastStudyDate: "2026-09-30",
    freezesAvailable: 1,
    lastFreezeWeek: null,
    ...overrides,
  };
}

describe("countsAsStudyDay", () => {
  it("counts 10+ minutes", () => {
    expect(countsAsStudyDay({ minutes: 10, questions: 0 })).toBe(true);
  });

  it("counts 5+ questions", () => {
    expect(countsAsStudyDay({ minutes: 2, questions: 5 })).toBe(true);
  });

  it("rejects a lazy day", () => {
    expect(countsAsStudyDay({ minutes: 5, questions: 2 })).toBe(false);
  });
});

describe("isoWeekKey", () => {
  it("produces ISO week keys", () => {
    expect(isoWeekKey(new Date("2026-10-08T10:00:00"))).toMatch(
      /^\d{4}-W\d{2}$/,
    );
  });

  it("starts a new key on Mondays", () => {
    const sunday = isoWeekKey(new Date("2026-10-04T10:00:00"));
    const monday = isoWeekKey(new Date("2026-10-05T10:00:00"));
    expect(sunday).not.toBe(monday);
  });
});

describe("updateStreak", () => {
  it("increments on consecutive days", () => {
    const result = updateStreak(baseState(), true, new Date("2026-10-01"));
    expect(result.current).toBe(6);
    expect(result.longest).toBe(7);
    expect(result.usedFreeze).toBe(false);
  });

  it("is idempotent within the same day", () => {
    const first = updateStreak(baseState(), true, new Date("2026-10-01"));
    const second = updateStreak(
      { ...baseState(), lastStudyDate: "2026-10-01", current: first.current },
      true,
      new Date("2026-10-01"),
    );
    expect(second.current).toBe(first.current);
  });

  it("uses a freeze to bridge exactly one missed day", () => {
    // Last studied Sep 30; skipped Oct 1 (freeze day); studies Oct 2.
    const result = updateStreak(baseState(), true, new Date("2026-10-02"));
    expect(result.usedFreeze).toBe(true);
    expect(result.current).toBe(6);
    expect(result.freezesAvailable).toBe(0);
  });

  it("resets after a 2+ day gap without freeze coverage", () => {
    const result = updateStreak(baseState(), true, new Date("2026-10-04"));
    expect(result.current).toBe(1);
    expect(result.usedFreeze).toBe(false);
  });

  it("does not bridge a gap when the week's freeze is already spent", () => {
    const result = updateStreak(
      baseState({
        freezesAvailable: 0,
        lastFreezeWeek: isoWeekKey(new Date("2026-10-01")),
      }),
      true,
      new Date("2026-10-02"),
    );
    expect(result.current).toBe(1);
    expect(result.usedFreeze).toBe(false);
  });

  it("refills the freeze at the start of a new week", () => {
    const result = updateStreak(
      baseState({
        freezesAvailable: 0,
        lastFreezeWeek: isoWeekKey(new Date("2026-09-30")),
      }),
      false,
      new Date("2026-10-06"),
    );
    expect(result.freezesAvailable).toBe(1);
  });

  it("starts a fresh streak for a brand-new user", () => {
    const result = updateStreak(
      baseState({ current: 0, longest: 0, lastStudyDate: null }),
      true,
      new Date("2026-10-01"),
    );
    expect(result.current).toBe(1);
  });
});
