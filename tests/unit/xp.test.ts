import { describe, expect, it } from "vitest";
import {
  applyDailyCap,
  DAILY_XP_CAPS,
  FIXED_XP,
  leagueFromLevel,
  levelFromXp,
  minimumTimeMs,
  questionXp,
  rankTitleFromLevel,
} from "@/lib/gamification/xp";

describe("minimumTimeMs", () => {
  it("scales with statement length within bounds", () => {
    expect(minimumTimeMs(10)).toBe(6000);
    expect(minimumTimeMs(40)).toBe(14000);
    expect(minimumTimeMs(5000)).toBe(45000);
  });
});

describe("questionXp", () => {
  it("pays zero XP below the minimum time (anti click-through)", () => {
    expect(
      questionXp({
        difficulty: 1200,
        correct: true,
        timeMs: 2000,
        statementLength: 100,
      }),
    ).toBe(0);
  });

  it("pays more for harder questions", () => {
    const easy = questionXp({
      difficulty: 900,
      correct: true,
      timeMs: 30_000,
      statementLength: 60,
    });
    const hard = questionXp({
      difficulty: 1800,
      correct: true,
      timeMs: 30_000,
      statementLength: 60,
    });
    expect(hard).toBeGreaterThan(easy);
  });

  it("wrong answers pay a small honest-participation amount", () => {
    expect(
      questionXp({
        difficulty: 1500,
        correct: false,
        timeMs: 60_000,
        statementLength: 100,
      }),
    ).toBe(2);
  });

  it("caps the difficulty bonus", () => {
    const xp = questionXp({
      difficulty: 9000,
      correct: true,
      timeMs: 60_000,
      statementLength: 100,
    });
    expect(xp).toBeLessThanOrEqual(25);
  });
});

describe("applyDailyCap", () => {
  it("blocks XP after the daily cap", () => {
    const already = DAILY_XP_CAPS.question - 5;
    expect(applyDailyCap("question", 10, already)).toBe(5);
    expect(applyDailyCap("question", 10, DAILY_XP_CAPS.question)).toBe(0);
  });

  it("never returns negative XP", () => {
    expect(applyDailyCap("essay", 10, DAILY_XP_CAPS.essay + 50)).toBe(0);
  });
});

describe("fixed rewards", () => {
  it("defines the one-shot rewards from the product spec", () => {
    expect(FIXED_XP.lessonCompleted).toBe(30);
    expect(FIXED_XP.essaySubmitted).toBe(50);
    expect(FIXED_XP.mockExamCompleted).toBe(100);
    expect(FIXED_XP.reviewCard).toBe(5);
  });
});

describe("levelFromXp", () => {
  it("starts at level 1 with zero XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("is monotonically non-decreasing", () => {
    let last = 1;
    for (let xp = 0; xp <= 5000; xp += 100) {
      const level = levelFromXp(xp);
      expect(level).toBeGreaterThanOrEqual(last);
      last = level;
    }
  });

  it("reaches a mid level after meaningful practice", () => {
    expect(levelFromXp(1000)).toBeGreaterThanOrEqual(6);
    expect(levelFromXp(10_000)).toBeGreaterThanOrEqual(20);
  });
});

describe("rankTitleFromLevel / leagueFromLevel", () => {
  it("assigns progressing lunar titles", () => {
    expect(rankTitleFromLevel(1)).toBe("Explorador Lunar");
    expect(rankTitleFromLevel(22)).toBe("Guardião da Lua Cheia");
  });

  it("keeps beginners out of advanced leagues", () => {
    expect(leagueFromLevel(1)).toBe("bronze");
    expect(leagueFromLevel(20)).toBe("diamond");
  });
});
