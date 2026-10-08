/**
 * Spaced repetition via FSRS (ts-fsrs), target retention 90% (doc 7.3).
 *
 * Ratings map from the attempt outcome:
 *   wrong            -> Again (card comes back)
 *   correct, slow    -> Hard
 *   correct, normal  -> Good
 *   correct, fast    -> Easy (interval grows faster)
 */
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type RecordLogItem,
} from "ts-fsrs";
import type { SrsCard, SrsState } from "@/lib/db/types";

const scheduler = fsrs(
  generatorParameters({
    request_retention: 0.9,
    enable_fuzz: true,
  }),
);

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export interface SchedulingResult {
  card: SrsCard;
  log: RecordLogItem["log"];
}

type NonManualRating = Exclude<Rating, Rating.Manual>;

function toRating(grade: ReviewGrade): NonManualRating {
  switch (grade) {
    case "again":
      return Rating.Again;
    case "hard":
      return Rating.Hard;
    case "good":
      return Rating.Good;
    case "easy":
      return Rating.Easy;
  }
}

function toFsrsState(state: SrsState): FsrsCard["state"] {
  switch (state) {
    case "new":
      return State.New;
    case "learning":
      return State.Learning;
    case "review":
      return State.Review;
    case "relearning":
      return State.Relearning;
  }
}

function fromFsrsState(state: FsrsCard["state"]): SrsState {
  switch (state) {
    case State.New:
      return "new";
    case State.Learning:
      return "learning";
    case State.Review:
      return "review";
    case State.Relearning:
      return "relearning";
    default:
      return "learning";
  }
}

function toFsrsCard(card: SrsCard): FsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty_fsrs,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: toFsrsState(card.state),
    last_review: card.reps > 0 ? new Date(card.last_update) : undefined,
  };
}

function fromFsrsCard(
  fsrsCard: FsrsCard,
  previous: SrsCard | null,
): SrsCard {
  return {
    id: previous?.id ?? "",
    user_id: previous?.user_id ?? "",
    question_id: previous?.question_id ?? null,
    concept_key: previous?.concept_key ?? null,
    due: fsrsCard.due.toISOString(),
    stability: fsrsCard.stability,
    difficulty_fsrs: fsrsCard.difficulty,
    elapsed_days: fsrsCard.elapsed_days,
    scheduled_days: fsrsCard.scheduled_days,
    reps: fsrsCard.reps,
    lapses: fsrsCard.lapses,
    learning_steps: fsrsCard.learning_steps,
    state: fromFsrsState(fsrsCard.state),
    // Keep the timeline consistent with the review date (not wall clock),
    // otherwise delta_t can go negative on back-dated tests.
    last_update: (fsrsCard.last_review ?? fsrsCard.due).toISOString(),
  };
}

/** Creates a brand-new SRS card row for a user/question pair. */
export function newCard(
  userId: string,
  questionId: string,
  now: Date = new Date(),
): SrsCard {
  const empty = createEmptyCard(now);
  return {
    id: "",
    user_id: userId,
    question_id: questionId,
    concept_key: null,
    due: empty.due.toISOString(),
    stability: empty.stability,
    difficulty_fsrs: empty.difficulty,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    learning_steps: 0,
    state: "new",
    last_update: now.toISOString(),
  };
}

/** Schedules the next review for an existing card. */
export function schedule(
  card: SrsCard,
  grade: ReviewGrade,
  now: Date = new Date(),
): SchedulingResult {
  const rating = toRating(grade);
  const item = scheduler.repeat(toFsrsCard(card), now, (log) => log[rating]);
  return {
    card: fromFsrsCard(item.card, card),
    log: item.log,
  };
}

/** Derives the review grade from a practice attempt. */
export function gradeFromAttempt(
  correct: boolean,
  timeMs: number,
  expectedMs: number,
): ReviewGrade {
  if (!correct) return "again";
  // Fast relative to expected → easy; slow → hard; otherwise good.
  const ratio = timeMs / Math.max(1, expectedMs);
  if (ratio <= 0.5) return "easy";
  if (ratio >= 1.8) return "hard";
  return "good";
}

/** Cards that must be reviewed today (due <= end of day). */
export function isDue(card: SrsCard, at: Date = new Date()): boolean {
  return new Date(card.due).getTime() <= at.getTime();
}

/** Interval in days until the next review (for display). */
export function daysUntilDue(card: SrsCard, at: Date = new Date()): number {
  return Math.ceil(
    (new Date(card.due).getTime() - at.getTime()) / 86400000,
  );
}
