-- ============================================================
-- StudyMoon — 0001_schema.sql
-- All tables (doc section 5). RLS lives in 0003, grants in 0004.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type question_status as enum ('draft', 'validated', 'reported', 'retired');
create type attempt_mode as enum ('practice', 'level_test', 'review', 'mock_exam', 'lesson_test');
create type xp_kind as enum ('question', 'review', 'lesson', 'essay', 'mock_exam', 'badge_bonus', 'streak_bonus');
create type report_reason as enum ('wrong_answer', 'ambiguous', 'offensive', 'broken', 'other');
create type essay_status as enum ('draft', 'submitted', 'correcting', 'corrected', 'failed');
create type essay_mode as enum ('training', 'exam');
create type mock_kind as enum ('day1', 'day2', 'partial', 'custom');
create type mock_status as enum ('in_progress', 'finished', 'abandoned');
create type job_status as enum ('pending', 'running', 'done', 'failed');
create type job_kind as enum ('generate_questions', 'review_question', 'generate_essay_theme');
create type notification_kind as enum ('reminder', 'escalation', 'streak_risk', 'return', 'weekly_summary');
create type notification_channel as enum ('push', 'telegram');
create type daily_goal_status as enum ('pending', 'partial', 'done');
create type league_tier as enum ('bronze', 'silver', 'gold', 'platinum', 'diamond');

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  apelido text not null,
  avatar_url text,
  birth_date date,
  timezone text not null default 'America/Sao_Paulo',
  target_exam_date date,
  daily_hours numeric(3,1) not null default 2,
  preferred_study_time time not null default '19:00',
  target_score int check (target_score between 0 and 1000),
  xp int not null default 0,
  level int not null default 1,
  rank_title text not null default 'Explorador Lunar',
  onboarding_completed boolean not null default false,
  level_test_completed boolean not null default false,
  notify_push boolean not null default true,
  notify_telegram boolean not null default false,
  telegram_chat_id text,
  telegram_link_code text,
  weekly_summary boolean not null default true,
  overload_guard boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_apelido_len check (char_length(apelido) between 2 and 24)
);

-- ---------- curriculum ----------
create table public.areas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  icon text,
  sort_order int not null default 0
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.areas(id) on delete cascade,
  parent_id uuid references public.topics(id) on delete cascade,
  slug text unique not null,
  name text not null,
  description text,
  level smallint not null default 1 check (level between 1 and 3),
  enem_weight numeric(4,2) not null default 1.0,
  matrix_code text,
  demo_id text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid unique not null references public.topics(id) on delete cascade,
  explanation_md text not null,
  demo_id text,
  videos jsonb not null default '[]'::jsonb,
  estimated_minutes int not null default 12,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- questions ----------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  difficulty int not null default 1200 check (difficulty between 400 and 2600),
  context_md text,
  statement_md text not null,
  alternatives jsonb not null,
  answer_key text not null check (answer_key in ('A','B','C','D','E')),
  explanation_md text not null,
  hints jsonb not null default '[]'::jsonb,
  demo_id text,
  status question_status not null default 'draft',
  source text,
  license text,
  origin text not null default 'seed',
  verified_by_model text,
  numeric_check boolean not null default false,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected text not null check (selected in ('A','B','C','D','E')),
  correct boolean not null,
  time_ms int not null default 0,
  mode attempt_mode not null default 'practice',
  created_at timestamptz not null default now()
);

create table public.topic_mastery (
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  elo int not null default 1200,
  confidence numeric(4,3) not null default 0,
  attempts_count int not null default 0,
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table public.srs_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  concept_key text,
  due timestamptz not null default now(),
  stability numeric(6,2) not null default 0,
  difficulty_fsrs numeric(4,2) not null default 5,
  elapsed_days int not null default 0,
  scheduled_days int not null default 0,
  reps int not null default 0,
  lapses int not null default 0,
  state text not null default 'new' check (state in ('new','learning','review','relearning')),
  last_update timestamptz not null default now(),
  unique (user_id, question_id),
  constraint srs_target check (question_id is not null or concept_key is not null)
);

-- ---------- habits ----------
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  mode text not null default 'practice',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_s int not null default 0,
  questions_answered int not null default 0,
  correct_count int not null default 0,
  xp_earned int not null default 0
);

create table public.daily_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  target_minutes int not null default 20,
  target_questions int not null default 10,
  done_minutes int not null default 0,
  done_questions int not null default 0,
  status daily_goal_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.streaks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  current int not null default 0,
  longest int not null default 0,
  last_study_date date,
  freezes_available int not null default 1,
  last_freeze_week date,
  updated_at timestamptz not null default now()
);

-- ---------- gamification ----------
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null,
  kind xp_kind not null,
  ref_id uuid,
  ref_text text,
  created_at timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  icon text not null,
  xp_reward int not null default 0,
  sort_order int not null default 0
);

create table public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.weekly_leaderboard (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  league league_tier not null default 'bronze',
  xp_week int not null default 0,
  rank int,
  updated_at timestamptz not null default now(),
  unique (week_start, user_id)
);

-- ---------- essays ----------
create table public.essay_themes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  texts_motivadores jsonb not null default '[]'::jsonb,
  kind text,
  status text not null default 'validated',
  created_at timestamptz not null default now()
);

create table public.essays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  theme_id uuid references public.essay_themes(id) on delete set null,
  prompt_title text not null,
  content_md text not null default '',
  word_count int not null default 0,
  status essay_status not null default 'draft',
  mode essay_mode not null default 'training',
  time_spent_s int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.essay_feedback (
  id uuid primary key default gen_random_uuid(),
  essay_id uuid not null references public.essays(id) on delete cascade,
  total_score int not null check (total_score between 0 and 1000),
  competencies jsonb not null,
  highlights jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  rewrite_example_md text,
  is_ai_estimate boolean not null default true,
  model_used text,
  created_at timestamptz not null default now()
);

-- ---------- mock exams ----------
create table public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind mock_kind not null default 'partial',
  status mock_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  time_limit_min int,
  score_estimate jsonb
);

create table public.mock_exam_items (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.mock_exams(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  position int not null,
  selected text,
  correct boolean,
  flagged boolean not null default false,
  time_ms int,
  unique (exam_id, question_id)
);

-- ---------- notifications ----------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  failures int not null default 0
);

create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind notification_kind not null,
  channel notification_channel not null default 'push',
  payload jsonb not null default '{}'::jsonb,
  result text not null default 'sent',
  sent_at timestamptz not null default now()
);

-- ---------- content engine ----------
create table public.content_jobs (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references public.topics(id) on delete cascade,
  kind job_kind not null default 'generate_questions',
  status job_status not null default 'pending',
  params jsonb not null default '{}'::jsonb,
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason report_reason not null,
  details text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.ai_cache (
  id uuid primary key default gen_random_uuid(),
  prompt_hash text unique not null,
  response jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
