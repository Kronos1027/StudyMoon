import { describe, expect, it } from "vitest";
import {
  daysUntilDue,
  gradeFromAttempt,
  isDue,
  newCard,
  schedule,
} from "@/lib/srs";

describe("newCard", () => {
  it("starts in the new state, due immediately", () => {
    const card = newCard("user-1", "question-1");
    expect(card.state).toBe("new");
    expect(card.reps).toBe(0);
    expect(isDue(card)).toBe(true);
  });
});

describe("schedule", () => {
  it("reschedules a correct answer further into the future than a wrong one", () => {
    const base = newCard("u", "q");
    const now = new Date("2026-10-01T12:00:00");

    const good = schedule(base, "good", now);
    const again = schedule(base, "again", now);

    expect(new Date(good.card.due).getTime()).toBeGreaterThan(now.getTime());
    expect(new Date(again.card.due).getTime()).toBeLessThanOrEqual(
      new Date(good.card.due).getTime(),
    );
  });

  it("increments reps and counts a lapse when a review card fails", () => {
    const base = newCard("u", "q");
    let card = base;
    let now = new Date("2026-10-01T12:00:00");

    // Graduate the card: repeat Good at each due date until it is in Review.
    for (let i = 0; i < 10 && card.state !== "review"; i++) {
      const result = schedule(card, "good", now);
      card = result.card;
      now = new Date(card.due);
    }
    expect(card.state).toBe("review");
    expect(card.reps).toBeGreaterThanOrEqual(2);
    const lapsesBefore = card.lapses;

    // Failing a review card counts as a lapse.
    const failed = schedule(card, "again", now);
    expect(failed.card.lapses).toBe(lapsesBefore + 1);
    expect(failed.card.state).toBe("relearning");
  });

  it("easy grows the interval more than good", () => {
    const base = newCard("u", "q");
    const now = new Date("2026-10-01T12:00:00");
    const good = schedule(base, "good", now);
    const easy = schedule(base, "easy", now);
    expect(easy.card.scheduled_days).toBeGreaterThanOrEqual(
      good.card.scheduled_days,
    );
  });
});

describe("gradeFromAttempt", () => {
  it("wrong answers are always 'again'", () => {
    expect(gradeFromAttempt(false, 10_000, 20_000)).toBe("again");
  });

  it("fast correct answers are 'easy'", () => {
    expect(gradeFromAttempt(true, 5_000, 30_000)).toBe("easy");
  });

  it("slow correct answers are 'hard'", () => {
    expect(gradeFromAttempt(true, 60_000, 20_000)).toBe("hard");
  });

  it("normal correct answers are 'good'", () => {
    expect(gradeFromAttempt(true, 20_000, 20_000)).toBe("good");
  });
});

describe("daysUntilDue / isDue", () => {
  it("computes days until due", () => {
    const card = newCard("u", "q", new Date("2026-10-01T00:00:00Z"));
    const at = new Date("2026-10-02T12:00:00Z");
    // Due 2026-10-01, now 2026-10-02 → overdue (negative days)
    expect(isDue(card, at)).toBe(true);
    expect(daysUntilDue(card, at)).toBeLessThanOrEqual(0);
  });
});
