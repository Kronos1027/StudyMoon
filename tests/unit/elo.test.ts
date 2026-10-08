import { describe, expect, it } from "vitest";
import {
  clampRating,
  confidenceFromAttempts,
  expectedScore,
  kFactor,
  updateDifficulty,
  updateMastery,
} from "@/lib/elo";

describe("expectedScore", () => {
  it("returns 0.5 when mastery equals difficulty", () => {
    expect(expectedScore(1200, 1200)).toBeCloseTo(0.5);
  });

  it("returns > 0.5 when mastery is above difficulty", () => {
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5);
  });

  it("returns < 0.5 when mastery is below difficulty", () => {
    expect(expectedScore(1000, 1400)).toBeLessThan(0.5);
  });
});

describe("kFactor", () => {
  it("shrinks as attempts accumulate", () => {
    const k1 = kFactor(1);
    const k10 = kFactor(10);
    const k50 = kFactor(50);
    expect(k1).toBeGreaterThan(k10);
    expect(k10).toBeGreaterThan(k50);
  });
});

describe("confidenceFromAttempts", () => {
  it("grows with attempts and saturates below 1", () => {
    expect(confidenceFromAttempts(0)).toBe(0);
    expect(confidenceFromAttempts(8)).toBeCloseTo(0.5);
    expect(confidenceFromAttempts(1000)).toBe(0.98);
  });
});

describe("updateMastery", () => {
  it("increases mastery on a correct answer", () => {
    const result = updateMastery(1200, 1200, true, 3);
    expect(result.delta).toBeGreaterThan(0);
    expect(result.elo).toBeGreaterThan(1200);
  });

  it("decreases mastery on a wrong answer", () => {
    const result = updateMastery(1200, 1200, false, 3);
    expect(result.delta).toBeLessThan(0);
    expect(result.elo).toBeLessThan(1200);
  });

  it("moves more when uncertainty is high (early attempts)", () => {
    const early = updateMastery(1200, 1200, true, 1);
    const late = updateMastery(1200, 1200, true, 40);
    expect(Math.abs(early.delta)).toBeGreaterThan(Math.abs(late.delta));
  });

  it("clamps ratings to the allowed range", () => {
    expect(updateMastery(2500, 400, true, 1).elo).toBeLessThanOrEqual(2600);
    expect(updateMastery(500, 2500, false, 1).elo).toBeGreaterThanOrEqual(400);
  });

  it("beating a much harder question is worth more", () => {
    const easy = updateMastery(1200, 1100, true, 1);
    const hard = updateMastery(1200, 1600, true, 1);
    expect(hard.delta).toBeGreaterThan(easy.delta);
  });
});

describe("clampRating", () => {
  it("enforces bounds", () => {
    expect(clampRating(100)).toBe(400);
    expect(clampRating(9999)).toBe(2600);
    expect(clampRating(1500)).toBe(1500);
  });
});

describe("updateDifficulty", () => {
  it("nudges difficulty up when learners fail", () => {
    const result = updateDifficulty(1200, false, 100);
    expect(result).toBeGreaterThan(1200);
  });

  it("nudges difficulty down when learners pass", () => {
    const result = updateDifficulty(1200, true, 100);
    expect(result).toBeLessThan(1200);
  });

  it("moves less with few attempts", () => {
    const small = Math.abs(updateDifficulty(1200, false, 2) - 1200);
    const large = Math.abs(updateDifficulty(1200, false, 300) - 1200);
    expect(large).toBeGreaterThan(small);
  });
});
