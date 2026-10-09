/**
 * Database row types (kept in sync with supabase/migrations/0001_schema.sql).
 * When the database is reachable, `supabase gen types` can replace this —
 * until then this is the single source of truth for TypeScript.
 */

export type QuestionStatus = "draft" | "validated" | "reported" | "retired";
export type AttemptMode =
  | "practice"
  | "level_test"
  | "review"
  | "mock_exam"
  | "lesson_test";
export type XpKind =
  | "question"
  | "review"
  | "lesson"
  | "essay"
  | "mock_exam"
  | "badge_bonus"
  | "streak_bonus";
export type ReportReason =
  | "wrong_answer"
  | "ambiguous"
  | "offensive"
  | "broken"
  | "other";
export type EssayStatus =
  | "draft"
  | "submitted"
  | "correcting"
  | "corrected"
  | "failed";
export type EssayMode = "training" | "exam";
export type MockKind = "day1" | "day2" | "partial" | "custom";
export type MockStatus = "in_progress" | "finished" | "abandoned";
export type SrsState = "new" | "learning" | "review" | "relearning";
export type LeagueTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface Profile {
  id: string;
  apelido: string;
  avatar_url: string | null;
  birth_date: string | null;
  timezone: string;
  target_exam_date: string | null;
  daily_hours: number;
  preferred_study_time: string;
  target_score: number | null;
  xp: number;
  level: number;
  rank_title: string;
  onboarding_completed: boolean;
  level_test_completed: boolean;
  notify_push: boolean;
  notify_telegram: boolean;
  telegram_chat_id: string | null;
  telegram_link_code: string | null;
  weekly_summary: boolean;
  overload_guard: boolean;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface Topic {
  id: string;
  area_id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  level: number;
  enem_weight: number;
  matrix_codes: string[];
  demo_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  topic_id: string;
  explanation_md: string;
  demo_id: string | null;
  videos: LessonVideo[];
  estimated_minutes: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface LessonVideo {
  id: string;
  title: string;
  channel: string;
}

export interface Alternative {
  key: "A" | "B" | "C" | "D" | "E";
  text: string;
}

/**
 * Question as the CLIENT may see it (answer columns are server-only).
 * `demo_id` is the simulator of the question's TOPIC (topics.demo_id, joined
 * at query time) — a question never carries an area-level or foreign-topic
 * demo. null = topic has no simulator → no demo section is rendered.
 */
export interface QuestionPublic {
  id: string;
  topic_id: string;
  difficulty: number;
  context_md: string | null;
  statement_md: string;
  alternatives: Alternative[];
  hints: string[];
  demo_id: string | null;
  status: QuestionStatus;
  source: string | null;
  license: string | null;
  origin: string;
  created_at: string;
}

/** Full question — SERVER ONLY. */
export interface QuestionFull extends QuestionPublic {
  answer_key: "A" | "B" | "C" | "D" | "E";
  explanation_md: string;
}

export interface Attempt {
  id: string;
  user_id: string;
  question_id: string;
  selected: "A" | "B" | "C" | "D" | "E";
  correct: boolean;
  time_ms: number;
  mode: AttemptMode;
  created_at: string;
}

export interface TopicMastery {
  user_id: string;
  topic_id: string;
  elo: number;
  confidence: number;
  attempts_count: number;
  last_attempt_at: string | null;
  updated_at: string;
}

export interface SrsCard {
  id: string;
  user_id: string;
  question_id: string | null;
  concept_key: string | null;
  due: string;
  stability: number;
  difficulty_fsrs: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  learning_steps: number;
  state: SrsState;
  last_update: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  topic_id: string | null;
  mode: string;
  started_at: string;
  ended_at: string | null;
  duration_s: number;
  questions_answered: number;
  correct_count: number;
  xp_earned: number;
}

export interface DailyGoal {
  id: string;
  user_id: string;
  date: string;
  target_minutes: number;
  target_questions: number;
  done_minutes: number;
  done_questions: number;
  status: "pending" | "partial" | "done";
  created_at: string;
}

export interface Streak {
  user_id: string;
  current: number;
  longest: number;
  last_study_date: string | null;
  freezes_available: number;
  last_freeze_week: string | null;
  updated_at: string;
}

export interface XpEvent {
  id: string;
  user_id: string;
  amount: number;
  kind: XpKind;
  ref_id: string | null;
  ref_text: string | null;
  created_at: string;
}

export interface Badge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  sort_order: number;
}

export interface UserBadge {
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface WeeklyLeaderboardRow {
  id: string;
  week_start: string;
  user_id: string;
  league: LeagueTier;
  xp_week: number;
  rank: number | null;
  updated_at: string;
}

export interface EssayTheme {
  id: string;
  title: string;
  texts_motivadores: Array<{ source: string; text: string }>;
  kind: string | null;
  status: string;
  created_at: string;
}

export interface Essay {
  id: string;
  user_id: string;
  theme_id: string | null;
  prompt_title: string;
  content_md: string;
  word_count: number;
  status: EssayStatus;
  mode: EssayMode;
  time_spent_s: number;
  created_at: string;
  updated_at: string;
}

export interface EssayCompetencyFeedback {
  key: "C1" | "C2" | "C3" | "C4" | "C5";
  score: number;
  justification: string;
}

export interface EssayFeedback {
  id: string;
  essay_id: string;
  total_score: number;
  competencies: EssayCompetencyFeedback[];
  highlights: Array<{ text: string; note: string }>;
  improvements: string[];
  rewrite_example_md: string | null;
  is_ai_estimate: boolean;
  model_used: string | null;
  created_at: string;
}

export interface MockExam {
  id: string;
  user_id: string;
  kind: MockKind;
  status: MockStatus;
  started_at: string;
  finished_at: string | null;
  time_limit_min: number | null;
  score_estimate: Record<string, unknown> | null;
}

export interface MockExamItem {
  id: string;
  exam_id: string;
  question_id: string;
  position: number;
  selected: string | null;
  correct: boolean | null;
  flagged: boolean;
  time_ms: number | null;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  user_agent: string | null;
  created_at: string;
  last_success_at: string | null;
  failures: number;
}

export interface QuestionReport {
  id: string;
  question_id: string;
  user_id: string;
  reason: ReportReason;
  details: string | null;
  resolved: boolean;
  created_at: string;
}
