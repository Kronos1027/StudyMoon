-- ============================================================
-- StudyMoon — 0005_indexes.sql
-- ============================================================

create index idx_topics_area on public.topics (area_id, sort_order);
create index idx_topics_parent on public.topics (parent_id);
create index idx_lessons_topic on public.lessons (topic_id);

create index idx_questions_topic_status on public.questions (topic_id, status);
create index idx_questions_difficulty on public.questions (difficulty);
create index idx_questions_origin on public.questions (origin);

create index idx_attempts_user_date on public.attempts (user_id, created_at desc);
create index idx_attempts_question on public.attempts (question_id);
create index idx_attempts_user_question on public.attempts (user_id, question_id, created_at desc);

create index idx_srs_user_due on public.srs_cards (user_id, due);
create index idx_srs_concept on public.srs_cards (concept_key);

create index idx_sessions_user_date on public.study_sessions (user_id, started_at desc);
create index idx_goals_user_date on public.daily_goals (user_id, date desc);
create index idx_xp_user_date on public.xp_events (user_id, created_at desc);
create index idx_xp_dedupe on public.xp_events (user_id, kind, ref_id);

create index idx_leaderboard_week on public.weekly_leaderboard (week_start desc, xp_week desc);
create index idx_leaderboard_user on public.weekly_leaderboard (user_id);

create index idx_essays_user on public.essays (user_id, created_at desc);
create index idx_essay_feedback_essay on public.essay_feedback (essay_id);

create index idx_mock_items_exam on public.mock_exam_items (exam_id, position);
create index idx_mock_exams_user on public.mock_exams (user_id, started_at desc);

create index idx_push_user on public.push_subscriptions (user_id);
create index idx_push_endpoint on public.push_subscriptions (endpoint);

create index idx_notif_user_date on public.notification_log (user_id, sent_at desc);
create index idx_notif_kind_date on public.notification_log (kind, sent_at desc);

create index idx_jobs_pending on public.content_jobs (status, created_at);
create index idx_reports_question on public.question_reports (question_id) where resolved = false;

create index idx_ai_cache_expires on public.ai_cache (expires_at);

-- Partial unique: no XP twice for the same question (anti-fraud, doc 7.5)
create unique index uq_xp_question_once
  on public.xp_events (user_id, kind, ref_id)
  where kind in ('question', 'review') and ref_id is not null;
