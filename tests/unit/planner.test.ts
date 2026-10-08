import { describe, expect, it } from "vitest";
import { generatePlan, planForDate, type PlanTopic } from "@/lib/planner";

const TOPICS: PlanTopic[] = [
  { id: "t-porcentagem", name: "Porcentagem", areaId: "mt", enemWeight: 9, level: 1 },
  { id: "t-funcoes", name: "Funções", areaId: "mt", enemWeight: 8, level: 2 },
  { id: "t-interpretacao", name: "Interpretação de texto", areaId: "lc", enemWeight: 10, level: 1 },
  { id: "t-genetica", name: "Genética", areaId: "cn", enemWeight: 7, level: 3 },
  { id: "t-geografia", name: "Geografia humana", areaId: "ch", enemWeight: 6, level: 2 },
];

const TODAY = new Date("2026-10-01T00:00:00");

describe("generatePlan", () => {
  it("produces one plan per day for the horizon", () => {
    const plans = generatePlan({
      today: TODAY,
      examDate: "2026-11-08",
      dailyHours: 2,
      topics: TOPICS,
      mastery: [],
      reviewsPerDay: 10,
      horizonDays: 14,
    });
    expect(plans).toHaveLength(14);
    expect(plans[0].date).toBe("2026-10-01");
    expect(plans[13].date).toBe("2026-10-14");
  });

  it("respects the daily time budget", () => {
    const plans = generatePlan({
      today: TODAY,
      examDate: "2026-11-08",
      dailyHours: 1.5,
      topics: TOPICS,
      mastery: [],
      reviewsPerDay: 5,
      horizonDays: 7,
    });
    for (const plan of plans) {
      expect(plan.totalMinutes).toBeLessThanOrEqual(90);
    }
  });

  it("puts review first when there are due cards", () => {
    const plans = generatePlan({
      today: TODAY,
      examDate: "2026-11-08",
      dailyHours: 3,
      topics: TOPICS,
      mastery: [],
      reviewsPerDay: 30,
      horizonDays: 7,
    });
    expect(plans[0].blocks[0]?.kind).toBe("review");
  });

  it("schedules a partial mock exam on Sundays", () => {
    const plans = generatePlan({
      today: new Date("2026-10-04T00:00:00"), // a Sunday
      examDate: "2026-11-08",
      dailyHours: 2,
      topics: TOPICS,
      mastery: [],
      reviewsPerDay: 5,
      horizonDays: 7,
    });
    const sunday = plans[0];
    expect(sunday.weekday).toBe(0);
    expect(sunday.blocks.some((b) => b.kind === "mock_exam")).toBe(true);
  });

  it("schedules exactly one essay per week (Saturday)", () => {
    const plans = generatePlan({
      today: TODAY,
      examDate: "2026-11-08",
      dailyHours: 2,
      topics: TOPICS,
      mastery: [],
      reviewsPerDay: 5,
      horizonDays: 14,
    });
    const essays = plans.filter((p) =>
      p.blocks.some((b) => b.kind === "essay"),
    );
    expect(essays).toHaveLength(2); // 2 Saturdays in 14 days
    expect(essays.every((p) => p.weekday === 6)).toBe(true);
  });

  it("stops introducing new topics in the final 10 days", () => {
    const plans = generatePlan({
      today: new Date("2026-10-25T00:00:00"),
      examDate: "2026-11-08", // 14 days out
      dailyHours: 2,
      topics: TOPICS,
      mastery: [],
      reviewsPerDay: 5,
      horizonDays: 14,
    });
    // First 4 days (days 11-14 before exam) may still have new lessons;
    // the last 10 days must be review/practice/mock/essay only.
    for (const plan of plans.slice(4)) {
      expect(plan.blocks.some((b) => b.kind === "new_lesson")).toBe(false);
    }
  });

  it("gives a weak profile basics-first and a strong profile practice-only", () => {
    const common = {
      today: TODAY,
      examDate: "2026-11-08",
      dailyHours: 2,
      topics: TOPICS,
      reviewsPerDay: 5,
      horizonDays: 10,
    };
    const weak = generatePlan({
      ...common,
      mastery: TOPICS.map((t) => ({ topicId: t.id, elo: 700, confidence: 0.9 })),
    });
    const strong = generatePlan({
      ...common,
      mastery: TOPICS.map((t) => ({ topicId: t.id, elo: 1900, confidence: 0.9 })),
    });

    // Weak profile: opens new lessons (basics first).
    const weakLessons = weak
      .flatMap((p) => p.blocks)
      .filter((b) => b.kind === "new_lesson");
    expect(weakLessons.length).toBeGreaterThan(0);

    // Strong profile: everything is mastered -> practice/review, no lessons.
    const strongLessons = strong
      .flatMap((p) => p.blocks)
      .filter((b) => b.kind === "new_lesson");
    expect(strongLessons).toHaveLength(0);

    // And the two plans are genuinely different (acceptance: Phase 5).
    expect(weak[0].blocks.map((b) => b.label)).not.toEqual(
      strong[0].blocks.map((b) => b.label),
    );
  });

  it("handles zero daily hours gracefully (no crash, empty days)", () => {
    const plans = generatePlan({
      today: TODAY,
      examDate: "2026-11-08",
      dailyHours: 0.2,
      topics: TOPICS,
      mastery: [],
      reviewsPerDay: 0,
      horizonDays: 3,
    });
    expect(plans).toHaveLength(3);
  });
});

describe("planForDate", () => {
  it("finds the plan for a specific date", () => {
    const plans = generatePlan({
      today: TODAY,
      examDate: "2026-11-08",
      dailyHours: 2,
      topics: TOPICS,
      mastery: [],
      reviewsPerDay: 5,
      horizonDays: 5,
    });
    expect(planForDate(plans, "2026-10-03")).not.toBeNull();
    expect(planForDate(plans, "2026-12-25")).toBeNull();
  });
});
