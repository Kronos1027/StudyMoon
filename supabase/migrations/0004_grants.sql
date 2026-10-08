-- ============================================================
-- StudyMoon — 0004_grants.sql
-- Column-level grants (anti-cheat / anti-tamper):
--   * questions: answer_key and explanation_md are SERVER-ONLY columns.
--     The client sees the question; the answer is revealed by a server
--     action after the attempt is recorded.
--   * profiles: gamification columns (xp, level, rank_title) are
--     server-only — a user cannot self-award XP.
--   * system-of-record tables: no client INSERT/UPDATE/DELETE at all
--     (attempts, xp_events, streaks, topic_mastery, srs_cards,
--     study_sessions, daily_goals, mock_exams, mock_exam_items,
--     essay_feedback, weekly_leaderboard, notification_log,
--     content_jobs, ai_cache, areas, topics, lessons, questions,
--     badges, user_badges, essay_themes).
-- ============================================================

-- ---------- questions: hide the answer ----------
revoke select on public.questions from authenticated;
grant select (id, topic_id, difficulty, context_md, statement_md, alternatives,
              hints, demo_id, status, source, license, origin, created_at)
  on public.questions to authenticated;

-- ---------- profiles: protect gamification ----------
revoke update on public.profiles from authenticated;
grant update (apelido, avatar_url, birth_date, timezone, target_exam_date,
              daily_hours, preferred_study_time, target_score,
              onboarding_completed, level_test_completed,
              notify_push, notify_telegram, telegram_chat_id, telegram_link_code,
              weekly_summary, overload_guard, updated_at)
  on public.profiles to authenticated;

revoke insert on public.profiles from authenticated;
grant insert (id, apelido) on public.profiles to authenticated;

-- ---------- essays: block edits after correction ----------
-- (status transitions to corrected/failed are service-only)
revoke update on public.essays from authenticated;
grant update (content_md, word_count, time_spent_s, updated_at)
  on public.essays to authenticated;
revoke insert on public.essays from authenticated;
grant insert (id, user_id, theme_id, prompt_title, content_md, word_count,
              mode, time_spent_s)
  on public.essays to authenticated;
revoke delete on public.essays from authenticated;
grant delete on public.essays to authenticated;

-- ---------- question_reports: columns ----------
revoke insert on public.question_reports from authenticated;
grant insert (question_id, user_id, reason, details)
  on public.question_reports to authenticated;

-- ---------- push_subscriptions: columns ----------
revoke insert on public.push_subscriptions from authenticated;
grant insert (user_id, endpoint, p256dh, auth_key, user_agent)
  on public.push_subscriptions to authenticated;

-- ---------- lock content/system tables to read-only ----------
revoke insert, update, delete on public.areas from authenticated;
revoke insert, update, delete on public.topics from authenticated;
revoke insert, update, delete on public.lessons from authenticated;
revoke insert, update, delete on public.questions from authenticated;
revoke insert, update, delete on public.badges from authenticated;
revoke insert, update, delete on public.essay_themes from authenticated;
revoke all on public.content_jobs from authenticated;
revoke all on public.ai_cache from authenticated;
revoke insert, update, delete on public.attempts from authenticated;
revoke insert, update, delete on public.xp_events from authenticated;
revoke insert, update, delete on public.streaks from authenticated;
revoke insert, update, delete on public.topic_mastery from authenticated;
revoke insert, update, delete on public.srs_cards from authenticated;
revoke insert, update, delete on public.study_sessions from authenticated;
revoke insert, update, delete on public.daily_goals from authenticated;
revoke insert, update, delete on public.mock_exams from authenticated;
revoke insert, update, delete on public.mock_exam_items from authenticated;
revoke insert, update, delete on public.essay_feedback from authenticated;
revoke insert, update, delete on public.weekly_leaderboard from authenticated;
revoke insert, update, delete on public.notification_log from authenticated;
revoke insert, update, delete on public.user_badges from authenticated;
