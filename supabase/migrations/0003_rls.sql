-- ============================================================
-- StudyMoon — 0003_rls.sql
-- RLS on EVERY table (doc section 5).
-- Model:
--   * Content tables: read-only for authenticated (gabriela: answer_key
--     and explanation are column-restricted in 0004; answers only via
--     server actions after an attempt).
--   * Personal tables: each user reads/writes only their own rows.
--   * System-of-record tables (attempts, xp, streaks, mastery...) are
--     written exclusively by server actions using the secret key.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.areas enable row level security;
alter table public.topics enable row level security;
alter table public.lessons enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.topic_mastery enable row level security;
alter table public.srs_cards enable row level security;
alter table public.study_sessions enable row level security;
alter table public.daily_goals enable row level security;
alter table public.streaks enable row level security;
alter table public.xp_events enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.weekly_leaderboard enable row level security;
alter table public.essay_themes enable row level security;
alter table public.essays enable row level security;
alter table public.essay_feedback enable row level security;
alter table public.mock_exams enable row level security;
alter table public.mock_exam_items enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_log enable row level security;
alter table public.content_jobs enable row level security;
alter table public.question_reports enable row level security;
alter table public.ai_cache enable row level security;

-- force RLS even for table owners (service uses service role, which bypasses)
alter table public.profiles force row level security;
alter table public.ai_cache force row level security;

-- ---------- profiles ----------
create policy "profiles: read own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- ---------- curriculum (public read for authenticated) ----------
create policy "areas: read" on public.areas
  for select to authenticated using (true);
create policy "topics: read" on public.topics
  for select to authenticated using (true);
create policy "lessons: read" on public.lessons
  for select to authenticated using (true);
create policy "questions: read validated" on public.questions
  for select to authenticated using (status = 'validated');
create policy "badges: read" on public.badges
  for select to authenticated using (true);
create policy "essay themes: read" on public.essay_themes
  for select to authenticated using (status = 'validated');

-- ---------- ranking (read all authenticated; written by service) ----------
create policy "leaderboard: read" on public.weekly_leaderboard
  for select to authenticated using (true);

-- ---------- personal rows ----------
create policy "attempts: read own" on public.attempts
  for select to authenticated using (auth.uid() = user_id);
create policy "mastery: read own" on public.topic_mastery
  for select to authenticated using (auth.uid() = user_id);
create policy "srs: read own" on public.srs_cards
  for select to authenticated using (auth.uid() = user_id);
create policy "sessions: read own" on public.study_sessions
  for select to authenticated using (auth.uid() = user_id);
create policy "goals: read own" on public.daily_goals
  for select to authenticated using (auth.uid() = user_id);
create policy "streaks: read own" on public.streaks
  for select to authenticated using (auth.uid() = user_id);
create policy "xp: read own" on public.xp_events
  for select to authenticated using (auth.uid() = user_id);
create policy "user badges: read own" on public.user_badges
  for select to authenticated using (auth.uid() = user_id);
create policy "notification log: read own" on public.notification_log
  for select to authenticated using (auth.uid() = user_id);

-- ---------- essays (user writes own) ----------
create policy "essays: read own" on public.essays
  for select to authenticated using (auth.uid() = user_id);
create policy "essays: insert own" on public.essays
  for insert to authenticated with check (auth.uid() = user_id);
create policy "essays: update own" on public.essays
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "essays: delete own" on public.essays
  for delete to authenticated using (auth.uid() = user_id);
create policy "essay feedback: read own" on public.essay_feedback
  for select to authenticated using (
    exists (select 1 from public.essays e where e.id = essay_id and e.user_id = auth.uid())
  );

-- ---------- mock exams (created by server actions, read own) ----------
create policy "mock exams: read own" on public.mock_exams
  for select to authenticated using (auth.uid() = user_id);
create policy "mock items: read own" on public.mock_exam_items
  for select to authenticated using (
    exists (select 1 from public.mock_exams m where m.id = exam_id and m.user_id = auth.uid())
  );

-- ---------- reports (user files their own) ----------
create policy "reports: insert own" on public.question_reports
  for insert to authenticated with check (auth.uid() = user_id);
create policy "reports: read own" on public.question_reports
  for select to authenticated using (auth.uid() = user_id);

-- ---------- push subscriptions (user manages own) ----------
create policy "push: read own" on public.push_subscriptions
  for select to authenticated using (auth.uid() = user_id);
create policy "push: insert own" on public.push_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "push: delete own" on public.push_subscriptions
  for delete to authenticated using (auth.uid() = user_id);

-- Tables with NO policies above (content_jobs, ai_cache, xp_events inserts,
-- attempts inserts, etc.) are service-role only: RLS enabled + no client
-- policies = fully denied to anon/authenticated.
