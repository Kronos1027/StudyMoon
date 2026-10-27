import { describe, expect, it } from "vitest";
import { firstAvailableDueQuestion, resolvePracticeMode } from "@/lib/practice/review";

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
