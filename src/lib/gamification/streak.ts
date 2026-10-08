/**
 * Streak rules (doc 7.5).
 *
 *  - Minimum day: 10 minutes of study OR 5 answered questions.
 *  - Streak freeze: 1 per ISO week, auto-consumed to cover a missed day.
 *  - Missing more than one day (without freeze) resets the streak.
 */

export const MIN_MINUTES = 10;
export const MIN_QUESTIONS = 5;

export interface DayActivity {
  minutes: number;
  questions: number;
}

/** Whether the day's activity counts toward the streak (minimum day). */
export function countsAsStudyDay(activity: DayActivity): boolean {
  return activity.minutes >= MIN_MINUTES || activity.questions >= MIN_QUESTIONS;
}

export interface StreakState {
  current: number;
  longest: number;
  lastStudyDate: string | null; // yyyy-mm-dd
  freezesAvailable: number;
  lastFreezeWeek: string | null; // ISO week key (e.g. "2026-W41")
}

export interface StreakUpdate {
  current: number;
  longest: number;
  freezesAvailable: number;
  usedFreeze: boolean;
  reset: boolean;
}

/** ISO week key in local time: "2026-W41". */
export function isoWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Thursday-based ISO week computation.
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(aKey: string, bKey: string): number {
  const a = new Date(aKey + "T00:00:00");
  const b = new Date(bKey + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/**
 * Updates the streak for "today" given whether the user studied today.
 * Freeze: 1 per ISO week; consumed automatically to bridge a 1-day gap.
 */
export function updateStreak(
  state: StreakState,
  studiedToday: boolean,
  today: Date,
): StreakUpdate {
  const todayKey = toKey(today);
  const weekKey = isoWeekKey(today);

  // Weekly freeze refill.
  const freezesAvailable =
    state.lastFreezeWeek === weekKey ? state.freezesAvailable : 1;

  if (state.lastStudyDate === todayKey) {
    // Already counted today — idempotent.
    return {
      current: state.current,
      longest: state.longest,
      freezesAvailable,
      usedFreeze: false,
      reset: false,
    };
  }

  if (studiedToday) {
    const gap = state.lastStudyDate
      ? daysBetween(state.lastStudyDate, todayKey)
      : null;
    // gap === 1 → consecutive day; gap === 2 with a freeze → freeze bridges it.
    let current = state.current + 1;
    let usedFreeze = false;
    let available = freezesAvailable;

    if (gap !== null && gap > 1) {
      if (gap === 2 && freezesAvailable > 0) {
        // Freeze covers the single missed day; the streak continues.
        usedFreeze = true;
        available = 0;
      } else {
        current = 1; // streak broken
      }
    }
    if (gap === 0) {
      // Same-day duplicate already handled above.
      current = state.current;
    }
    return {
      current,
      longest: Math.max(state.longest, current),
      freezesAvailable: available,
      usedFreeze,
      reset: false,
    };
  }

  // Did not study today: only matters retroactively on the next study day
  // (the freeze logic above). Nothing changes yet.
  return {
    current: state.current,
    longest: state.longest,
    freezesAvailable,
    usedFreeze: false,
    reset: false,
  };
}
