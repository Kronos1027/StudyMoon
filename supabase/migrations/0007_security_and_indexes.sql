-- StudyMoon 0007: enforce least privilege for auth triggers and keep
-- question demo metadata readable without revealing any answer material.
-- Validated against live pg_proc/pg_policies/column grants on 2026-10-27.
-- Apply only after testing on a disposable database / preview environment.

-- getNextQuestion() selects these two public-safe simulator fields with
-- an authenticated Supabase client. Prior grants were missing, resulting
-- in "permission denied for table questions" for the entire query.
-- NEVER grant answer_key, explanation_md, numeric_expr or review_note.
grant select (subtopic, demo_params) on public.questions to authenticated;

-- Trigger functions should not also be exposed as RPC entry points.
-- EXECUTE privileges are not required by ordinary clients for the existing
-- triggers on auth.users and public.profiles to fire.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_profile() from public, anon, authenticated;

-- All referenced application tables in these functions are qualified.
-- The empty search_path still resolves PostgreSQL built-ins via pg_catalog.
alter function public.handle_new_user() set search_path = '';
alter function public.handle_new_profile() set search_path = '';
alter function public.set_updated_at() set search_path = '';

-- Foreign-key supporting indexes, based on live Advisor findings.
-- Existing composite indexes are intentionally retained (different
-- leading column/query pattern). Tables are currently small; indexes
-- should be evaluated again when write traffic is significant.
create index if not exists idx_content_jobs_topic_id
  on public.content_jobs (topic_id);
create index if not exists idx_essays_theme_id
  on public.essays (theme_id);
create index if not exists idx_mock_items_question_id
  on public.mock_exam_items (question_id);
create index if not exists idx_question_reports_user_id
  on public.question_reports (user_id);
create index if not exists idx_srs_cards_question_id
  on public.srs_cards (question_id);
create index if not exists idx_study_sessions_topic_id
  on public.study_sessions (topic_id);
create index if not exists idx_topic_mastery_topic_id
  on public.topic_mastery (topic_id);
create index if not exists idx_user_badges_badge_id
  on public.user_badges (badge_id);
