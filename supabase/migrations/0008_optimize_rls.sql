-- StudyMoon 0008: optimize existing RLS policies without widening access.
-- Generated from pg_policies in the live project on 2026-10-27.
-- Keep the exact original names and ownership predicates; only replace
-- auth.uid() with (select auth.uid()) to avoid row-by-row re-evaluation.
-- Test per-user isolation on staging before deploying to production.

alter policy "attempts: read own" on public.attempts using (((select auth.uid()) = user_id));

alter policy "goals: read own" on public.daily_goals using (((select auth.uid()) = user_id));

alter policy "essay feedback: read own" on public.essay_feedback using ((EXISTS ( SELECT 1
   FROM essays e
  WHERE ((e.id = essay_feedback.essay_id) AND (e.user_id = (select auth.uid()))))));

alter policy "essays: delete own" on public.essays using (((select auth.uid()) = user_id));

alter policy "essays: insert own" on public.essays with check (((select auth.uid()) = user_id));

alter policy "essays: read own" on public.essays using (((select auth.uid()) = user_id));

alter policy "essays: update own" on public.essays using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

alter policy "mock items: read own" on public.mock_exam_items using ((EXISTS ( SELECT 1
   FROM mock_exams m
  WHERE ((m.id = mock_exam_items.exam_id) AND (m.user_id = (select auth.uid()))))));

alter policy "mock exams: read own" on public.mock_exams using (((select auth.uid()) = user_id));

alter policy "notification log: read own" on public.notification_log using (((select auth.uid()) = user_id));

alter policy "profiles: insert own" on public.profiles with check (((select auth.uid()) = id));

alter policy "profiles: read own" on public.profiles using (((select auth.uid()) = id));

alter policy "profiles: update own" on public.profiles using (((select auth.uid()) = id)) with check (((select auth.uid()) = id));

alter policy "push: delete own" on public.push_subscriptions using (((select auth.uid()) = user_id));

alter policy "push: insert own" on public.push_subscriptions with check (((select auth.uid()) = user_id));

alter policy "push: read own" on public.push_subscriptions using (((select auth.uid()) = user_id));

alter policy "reports: insert own" on public.question_reports with check (((select auth.uid()) = user_id));

alter policy "reports: read own" on public.question_reports using (((select auth.uid()) = user_id));

alter policy "srs: read own" on public.srs_cards using (((select auth.uid()) = user_id));

alter policy "streaks: read own" on public.streaks using (((select auth.uid()) = user_id));

alter policy "sessions: read own" on public.study_sessions using (((select auth.uid()) = user_id));

alter policy "mastery: read own" on public.topic_mastery using (((select auth.uid()) = user_id));

alter policy "user badges: read own" on public.user_badges using (((select auth.uid()) = user_id));

alter policy "xp: read own" on public.xp_events using (((select auth.uid()) = user_id));
