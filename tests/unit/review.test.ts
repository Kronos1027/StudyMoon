import { describe, expect, it } from "vitest";
import { firstAvailableDueQuestion, isReviewDue, resolvePracticeMode } from "@/lib/practice/review";

describe("study mode routing", () => {
  it("opens the FSRS queue for the review link", () => {
    expect(resolvePracticeMode("revisao")).toBe("review");
  });

  it("keeps the lesson test distinct from adaptive practice", () => {
    expect(resolvePracticeMode("teste")).toBe("lesson_test");
    expect(resolvePracticeMode()).toBe("practice");
    expect(resolvePracticeMode("invalido")).toBe("practice");
  });
});

describe("due-only review selection", () => {
  it("prefers the oldest due validated question", () => {
    expect(firstAvailableDueQuestion(
      ["older-due", "recently-due"],
      ["recently-due", "older-due", "not-due"],
    )).toBe("older-due");
  });

  it("ignores removed or out-of-topic due questions", () => {
    expect(firstAvailableDueQuestion(
      ["removed-question", "still-due"],
      ["not-due", "still-due"],
    )).toBe("still-due");
  });

  it("never substitutes a normal practice question when the queue is empty", () => {
    expect(firstAvailableDueQuestion([], ["not-due"])).toBeNull();
    expect(firstAvailableDueQuestion(["removed-question"], ["not-due"])).toBeNull();
  });
});

describe("server-side due-card eligibility", () => {
  const now = new Date("2026-10-28T12:00:00.000Z");

  it("accepts a card scheduled exactly now or earlier", () => {
    expect(isReviewDue("2026-10-27T11:00:00.000Z", now)).toBe(true);
    expect(isReviewDue("2026-10-28T12:00:00.000Z", now)).toBe(true);
  });

  it("rejects future, absent and malformed due dates", () => {
    expect(isReviewDue("2026-10-29T11:00:00.000Z", now)).toBe(false);
    expect(isReviewDue(null, now)).toBe(false);
    expect(isReviewDue(undefined, now)).toBe(false);
    expect(isReviewDue("not-a-date", now)).toBe(false);
  });
});
