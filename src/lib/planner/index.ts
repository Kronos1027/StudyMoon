/**
 * Study planner (doc 7.4).
 *
 * Inputs: exam date, daily hours, current mastery per topic, topic weights
 * (historical ENEM frequency), review load. Output: a day-by-day plan with
 * blocks (new lesson, practice, review, mock exam, essay).
 *
 * Rules:
 *  - Sunday: partial mock exam.
 *  - One essay per week (Saturday).
 *  - Review blocks come first (FSRS due queue has priority).
 *  - Weakest + heaviest topics are scheduled first.
 *  - Last 10 days before the exam: review + mocks only, no new topics.
 *
 * Deterministic (no RNG) so two profiles produce comparable, testable plans.
 */
import type { TopicMasteryLike } from "@/lib/practice/selection";

export type BlockKind = "review" | "new_lesson" | "practice" | "mock_exam" | "essay";

export interface PlanTopic {
  id: string;
  name: string;
  areaId: string;
  enemWeight: number; // 0..10 historical ENEM frequency
  level: number; // 1 basic, 2 intermediate, 3 advanced
}

export interface PlanBlock {
  kind: BlockKind;
  minutes: number;
  topicId?: string;
  label: string;
}

export interface DayPlan {
  date: string; // yyyy-mm-dd
  weekday: number; // 0 Sunday .. 6 Saturday
  blocks: PlanBlock[];
  totalMinutes: number;
}

export interface PlanInput {
  today: Date;
  examDate: string; // yyyy-mm-dd
  dailyHours: number;
  topics: PlanTopic[];
  mastery: TopicMasteryLike[];
  /** Average FSRS cards due per day for the coming week (estimate). */
  reviewsPerDay: number;
  /** Plan horizon in days (defaults to exam date, capped at 84). */
  horizonDays?: number;
}

const FOCUS_BLOCK_MIN = 25;
const REVIEW_MIN_PER_CARD = 1.2; // ~50 cards/hour with friction

function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Elo expectation for a topic level: basic 1150, intermediate 1400, advanced 1650. */
function levelExpectation(level: number): number {
  return 900 + level * 250;
}

/** Priority: heavy ENEM weight + weak mastery comes first; mastered topics sink. */
function topicPriority(topic: PlanTopic, elo: number): number {
  const weakness = 1 - Math.min(1, Math.max(0, (elo - 400) / 1800));
  let priority =
    topic.enemWeight * (0.4 + 0.6 * weakness) - topic.level * 0.2;
  // Topics the learner has already mastered at their level go to the back.
  if (elo >= levelExpectation(topic.level) + 200) priority -= 6;
  return priority;
}

/** A topic counts as mastered when its Elo is well above the level expectation. */
export function isTopicMastered(topic: PlanTopic, elo: number): boolean {
  return elo >= levelExpectation(topic.level) + 200;
}

export function generatePlan(input: PlanInput): DayPlan[] {
  const start = new Date(input.today);
  start.setHours(0, 0, 0, 0);
  const exam = new Date(input.examDate + "T00:00:00");
  const daysToExam = Math.max(
    0,
    Math.round((exam.getTime() - start.getTime()) / 86400000),
  );
  const horizon = Math.min(input.horizonDays ?? 28, Math.min(daysToExam, 84));

  // Order topics: weakest & heaviest first; basics before advanced overall.
  const masteryMap = new Map(input.mastery.map((m) => [m.topicId, m]));
  const ordered = [...input.topics].sort((a, b) => {
    const pa = topicPriority(a, masteryMap.get(a.id)?.elo ?? 1200);
    const pb = topicPriority(b, masteryMap.get(b.id)?.elo ?? 1200);
    if (pb !== pa) return pb - pa;
    return a.level - b.level;
  });

  // A "new lesson" opens a topic; practice consolidates it. Mastered topics
  // never get new lessons (practice keeps them sharp instead).
  const dailyMinutes = Math.round(input.dailyHours * 60);
  const newLessonDays = Math.max(0, Math.floor(horizon * 0.7));

  const plans: DayPlan[] = [];
  let topicCursor = 0;

  const nextLessonTopic = (): PlanTopic | null => {
    while (topicCursor < ordered.length) {
      const topic = ordered[topicCursor];
      const elo = masteryMap.get(topic.id)?.elo ?? 1200;
      if (!isTopicMastered(topic, elo)) return topic;
      topicCursor += 1;
    }
    return null;
  };

  for (let i = 0; i < horizon; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const weekday = date.getDay();
    const key = toKey(date);
    const daysLeft = daysToExam - i;
    const blocks: PlanBlock[] = [];

    const addBlock = (block: PlanBlock) => {
      const remaining =
        dailyMinutes - blocks.reduce((sum, b) => sum + b.minutes, 0);
      if (remaining <= 0) return;
      blocks.push({ ...block, minutes: Math.min(block.minutes, remaining) });
    };

    // 1. Review queue first (FSRS).
    const reviewMinutes = Math.min(
      Math.round(input.reviewsPerDay * REVIEW_MIN_PER_CARD),
      Math.round(dailyMinutes * 0.3),
    );
    if (reviewMinutes >= FOCUS_BLOCK_MIN) {
      addBlock({
        kind: "review",
        minutes: reviewMinutes,
        label: "Revisão do dia",
      });
    }

    // 2. Sunday: partial mock exam.
    if (weekday === 0) {
      addBlock({
        kind: "mock_exam",
        minutes: 60,
        label: "Simulado parcial (domingo)",
      });
    }

    // 3. Saturday: weekly essay.
    if (weekday === 6) {
      addBlock({
        kind: "essay",
        minutes: 60,
        label: "Redação da semana",
      });
    }

    // 4. New lesson (not in the final stretch, not already mastered).
    const inFinalStretch = daysLeft <= 10;
    if (!inFinalStretch && i < newLessonDays) {
      const topic = nextLessonTopic();
      if (topic) {
        addBlock({
          kind: "new_lesson",
          minutes: FOCUS_BLOCK_MIN,
          topicId: topic.id,
          label: `Aula nova: ${topic.name}`,
        });
        // Advance the cursor every other day (practice consolidates between).
        if (i % 2 === 1) topicCursor += 1;
      }
    }

    // 5. Fill the rest with practice on the most urgent topics.
    let fillCursor = Math.max(0, topicCursor - 2); // practice recent topics first
    while (
      blocks.reduce((sum, b) => sum + b.minutes, 0) + FOCUS_BLOCK_MIN <=
        dailyMinutes &&
      ordered.length > 0
    ) {
      const topic = ordered[fillCursor % ordered.length];
      addBlock({
        kind: "practice",
        minutes: FOCUS_BLOCK_MIN,
        topicId: topic.id,
        label: `Prática: ${topic.name}`,
      });
      fillCursor += 1;
    }

    plans.push({
      date: key,
      weekday,
      blocks,
      totalMinutes: blocks.reduce((sum, b) => sum + b.minutes, 0),
    });
  }

  return plans;
}

/** Estimated minutes planned for a specific date (for daily goals). */
export function planForDate(plans: DayPlan[], dateKey: string): DayPlan | null {
  return plans.find((p) => p.date === dateKey) ?? null;
}
