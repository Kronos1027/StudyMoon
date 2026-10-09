import "server-only";
import { getSupabaseServerClient } from "@/lib/db/server";
import {
  generatePlan,
  planForDate,
  toKey as planDateKey,
  type DayPlan,
} from "@/lib/planner";
import type { TopicMasteryLike } from "@/lib/practice/selection";
import type {
  Area,
  Profile,
  Streak,
  Topic,
  TopicMastery,
  WeeklyLeaderboardRow,
} from "@/lib/db/types";

export interface DayActivity {
  date: string;
  questions: number;
  correct: number;
}

export interface DashboardData {
  profile: Profile;
  streak: Streak;
  goal: {
    doneQuestions: number;
    targetQuestions: number;
    doneMinutes: number;
    targetMinutes: number;
  };
  last14Days: DayActivity[];
  last84DaysMap: Map<string, number>;
  masteryByArea: Array<{ area: string; percent: number }>;
  weaknesses: Array<{ topic: Topic; mastery: TopicMastery }>;
  ranking: WeeklyLeaderboardRow[];
  reviewsDue: number;
  xpToday: number;
  /** Planner output for today (null when the user has no exam date). */
  todayPlan: DayPlan | null;
  /** topic id -> slug, used to deep-link plan blocks. */
  topicSlugById: Record<string, string>;
}

/** Maps an Elo rating (400..1800) to a readable mastery percent. */
export function eloToPercent(elo: number): number {
  return Math.max(0, Math.min(100, ((elo - 400) / 1400) * 100));
}

function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function getDashboardData(userId: string): Promise<DashboardData | null> {
  const supabase = await getSupabaseServerClient();

  const [{ data: profile }, { data: streak }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("streaks").select("*").eq("user_id", userId).single(),
  ]);
  if (!profile) return null;

  const todayKey = dateKey(new Date());
  const since14 = dateKey(new Date(Date.now() - 13 * 86400000));
  const since84 = dateKey(new Date(Date.now() - 83 * 86400000));

  const [
    { data: attempts14 },
    { data: attempts84 },
    { data: masteryRows },
    { data: topicRows },
    { data: areaRows },
    { data: ranking },
    { data: dueCards },
    { data: xpTodayRows },
    { data: goalRow },
  ] = await Promise.all([
    supabase
      .from("attempts")
      .select("correct, created_at")
      .eq("user_id", userId)
      .gte("created_at", since14),
    supabase
      .from("attempts")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", since84),
    supabase.from("topic_mastery").select("*").eq("user_id", userId),
    supabase.from("topics").select("id, name, area_id, slug, level, enem_weight").not("parent_id", "is", null),
    supabase.from("areas").select("*"),
    supabase
      .from("weekly_leaderboard")
      .select("*")
      .order("xp_week", { ascending: false })
      .limit(8),
    supabase
      .from("srs_cards")
      .select("id, due")
      .eq("user_id", userId)
      .lte("due", new Date(Date.now() + 7 * 86400000).toISOString()),
    supabase
      .from("xp_events")
      .select("amount")
      .eq("user_id", userId)
      .gte("created_at", todayKey),
    supabase
      .from("daily_goals")
      .select("*")
      .eq("user_id", userId)
      .eq("date", todayKey)
      .single(),
  ]);

  // ----- last 14 days -----
  const byDay = new Map<string, { questions: number; correct: number }>();
  for (const a of attempts14 ?? []) {
    const key = (a.created_at as string).slice(0, 10);
    const entry = byDay.get(key) ?? { questions: 0, correct: 0 };
    entry.questions += 1;
    if (a.correct) entry.correct += 1;
    byDay.set(key, entry);
  }
  const last14Days: DayActivity[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000);
    const key = dateKey(d);
    const entry = byDay.get(key);
    return {
      date: key,
      questions: entry?.questions ?? 0,
      correct: entry?.correct ?? 0,
    };
  });

  // ----- 84-day consistency map -----
  const last84DaysMap = new Map<string, number>();
  for (const a of attempts84 ?? []) {
    const key = (a.created_at as string).slice(0, 10);
    last84DaysMap.set(key, (last84DaysMap.get(key) ?? 0) + 1);
  }

  // ----- mastery per area -----
  const masteryByTopic = new Map((masteryRows ?? []).map((m) => [m.topic_id, m]));
  const topics = (topicRows ?? []) as Topic[];
  const areas = (areaRows ?? []) as Area[];
  const areaAgg = new Map<string, { sum: number; count: number }>();
  for (const topic of topics) {
    const mastery = masteryByTopic.get(topic.id);
    if (!mastery) continue;
    const agg = areaAgg.get(topic.area_id) ?? { sum: 0, count: 0 };
    agg.sum += eloToPercent(mastery.elo);
    agg.count += 1;
    areaAgg.set(topic.area_id, agg);
  }
  const masteryByArea = areas
    .filter((a) => areaAgg.has(a.id))
    .map((a) => {
      const agg = areaAgg.get(a.id)!;
      return { area: a.name, percent: agg.sum / agg.count };
    })
    .sort((a, b) => b.percent - a.percent);

  // ----- weaknesses: lowest elo, only with evidence -----
  const weaknesses = (masteryRows ?? [])
    .map((m) => ({
      mastery: m,
      topic: topics.find((t) => t.id === m.topic_id),
    }))
    .filter((w): w is { topic: Topic; mastery: TopicMastery } =>
      Boolean(w.topic) && w.mastery.attempts_count >= 2,
    )
    .sort((a, b) => a.mastery.elo - b.mastery.elo)
    .slice(0, 4);

  // ----- today's plan (planner, doc section 7.4) -----
  // The due queue was fetched with a 7-day window: cards due now (review
  // priority) plus the weekly load estimate the planner uses for pacing.
  const dueWindow = dueCards ?? [];
  const reviewsDue = dueWindow.filter(
    (c) => new Date(c.due as string).getTime() <= Date.now(),
  ).length;
  const reviewsPerDay = Math.ceil(dueWindow.length / 7);

  const topicSlugById: Record<string, string> = {};
  for (const topic of topics) topicSlugById[topic.id] = topic.slug;

  let todayPlan: DayPlan | null = null;
  if (profile.target_exam_date) {
    const masteryLike: TopicMasteryLike[] = (masteryRows ?? []).map((m) => ({
      topicId: m.topic_id,
      elo: m.elo,
      confidence: m.confidence ?? 0,
    }));
    const plans = generatePlan({
      today: new Date(),
      examDate: profile.target_exam_date,
      dailyHours: Number(profile.daily_hours ?? 2),
      topics: topics.map((t) => ({
        id: t.id,
        name: t.name,
        areaId: t.area_id,
        enemWeight: t.enem_weight,
        level: t.level,
      })),
      mastery: masteryLike,
      reviewsPerDay,
    });
    todayPlan = planForDate(plans, planDateKey(new Date()));
  }

  // ----- goal -----
  const targetQuestions = goalRow?.target_questions ?? 10;
  const targetMinutes = goalRow?.target_minutes ?? Math.round(Number(profile.daily_hours ?? 2) * 60);
  const todayActivity = byDay.get(todayKey);

  return {
    profile: profile as Profile,
    streak: (streak ?? {
      user_id: userId,
      current: 0,
      longest: 0,
      last_study_date: null,
      freezes_available: 1,
      last_freeze_week: null,
      updated_at: new Date().toISOString(),
    }) as Streak,
    goal: {
      doneQuestions: Math.min(todayActivity?.questions ?? 0, targetQuestions),
      targetQuestions,
      doneMinutes: goalRow?.done_minutes ?? 0,
      targetMinutes,
    },
    last14Days,
    last84DaysMap,
    masteryByArea,
    weaknesses,
    ranking: (ranking ?? []) as WeeklyLeaderboardRow[],
    reviewsDue,
    xpToday: (xpTodayRows ?? []).reduce((sum, r) => sum + r.amount, 0),
    todayPlan,
    topicSlugById,
  };
}
