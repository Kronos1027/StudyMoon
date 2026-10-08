import { describe, expect, it } from "vitest";
import {
  filterRecentlyAttempted,
  selectNextQuestion,
  type CandidateQuestion,
  type TopicMasteryLike,
} from "@/lib/practice/selection";

const NOW = new Date("2026-10-01T12:00:00");

function q(id: string, topicId: string, difficulty: number): CandidateQuestion {
  return { id, topicId, difficulty };
}

function m(topicId: string, elo: number, confidence = 0.5): TopicMasteryLike {
  return { topicId, elo, confidence };
}

/** Deterministic RNG factory for tests. */
function seqRng(...values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("filterRecentlyAttempted", () => {
  it("blocks questions attempted within 7 days", () => {
    const candidates = [q("q1", "t1", 1200), q("q2", "t1", 1250)];
    const attempts = [
      { questionId: "q1", attemptedAt: "2026-09-28T12:00:00" }, // 3 days ago
    ];
    const result = filterRecentlyAttempted(candidates, attempts, NOW);
    expect(result.map((c) => c.id)).toEqual(["q2"]);
  });

  it("allows questions attempted more than 7 days ago", () => {
    const candidates = [q("q1", "t1", 1200)];
    const attempts = [
      { questionId: "q1", attemptedAt: "2026-09-20T12:00:00" }, // 11 days ago
    ];
    expect(filterRecentlyAttempted(candidates, attempts, NOW)).toHaveLength(1);
  });
});

describe("selectNextQuestion", () => {
  // Probabilities for mastery 1200: d=900 -> 0.85 (too easy),
  // d=1060 -> ~0.69 (challenge zone), d=1250 -> 0.43 (too hard).
  const candidates = [
    q("easy", "t1", 900),
    q("perfect", "t1", 1060),
    q("hard", "t2", 1700),
    q("weak-topic-q", "t2", 1400),
    q("other", "t3", 1200),
  ];
  const mastery = [m("t1", 1200), m("t2", 900), m("t3", 1300)];

  it("returns null when the pool is empty", () => {
    expect(
      selectNextQuestion({
        candidates: [],
        mastery: [],
        recentAttempts: [],
        now: NOW,
      }),
    ).toBeNull();
  });

  it("picks a challenge question with P(correct) in [0.6, 0.8] when roll < 0.7", () => {
    const selection = selectNextQuestion({
      candidates,
      mastery,
      recentAttempts: [],
      now: NOW,
      rng: seqRng(0.5),
    });
    expect(selection).not.toBeNull();
    expect(selection!.reason).toBe("challenge");
    expect(selection!.probabilityCorrect).toBeGreaterThanOrEqual(0.6);
    expect(selection!.probabilityCorrect).toBeLessThanOrEqual(0.8);
    expect(selection!.question.id).toBe("perfect");
  });

  it("picks from the weakest topic when 0.7 <= roll < 0.9", () => {
    const selection = selectNextQuestion({
      candidates,
      mastery,
      recentAttempts: [],
      now: NOW,
      rng: seqRng(0.75, 0.0),
    });
    expect(selection).not.toBeNull();
    expect(selection!.reason).toBe("weak_topic");
    // t2 has the lowest elo (900)
    expect(selection!.question.topicId).toBe("t2");
  });

  it("interleaves away from the last topic on roll >= 0.9", () => {
    const selection = selectNextQuestion({
      candidates,
      mastery,
      recentAttempts: [],
      lastTopicId: "t1",
      now: NOW,
      rng: seqRng(0.95, 0.0),
    });
    expect(selection).not.toBeNull();
    expect(selection!.reason).toBe("interleave");
    expect(selection!.question.topicId).not.toBe("t1");
  });

  it("never returns a question blocked by the repeat window", () => {
    const blocked = candidates.map((c, i) => ({
      questionId: c.id,
      attemptedAt: new Date(NOW.getTime() - (i + 1) * 86400000).toISOString(),
    }));
    const selection = selectNextQuestion({
      candidates,
      mastery,
      recentAttempts: blocked,
      now: NOW,
      rng: seqRng(0.95, 0.99, 0.999),
    });
    expect(selection).toBeNull();
  });

  it("falls back to the whole pool when no question is in the challenge zone", () => {
    const onlyImpossible = [q("q1", "t1", 2400), q("q2", "t1", 2500)];
    const selection = selectNextQuestion({
      candidates: onlyImpossible,
      mastery: [m("t1", 800)],
      recentAttempts: [],
      now: NOW,
      rng: seqRng(0.1, 0.5),
    });
    // Challenge zone empty → weak topic path picks one anyway
    expect(selection).not.toBeNull();
    expect(["q1", "q2"]).toContain(selection!.question.id);
  });
});
