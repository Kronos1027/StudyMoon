// Verifica o funil completo do submitAttempt no banco para o usuario E2E
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "prefer", max: 1 });
const uid = process.argv[2];

const profile = await sql`
  select apelido, xp, level, rank_title, daily_hours, target_score, onboarding_completed
  from profiles where id = ${uid}
`;
console.log("PROFILE:", JSON.stringify(profile[0]));

const attempts = await sql`
  select a.correct, a.time_ms, a.mode, a.selected, q.difficulty, t.slug as topic
  from attempts a join questions q on q.id = a.question_id join topics t on t.id = q.topic_id
  where a.user_id = ${uid}
`;
console.log(`ATTEMPTS (${attempts.length}):`);
for (const a of attempts) console.log(`  topic=${a.topic} correta=${a.correct} marcada=${a.selected} tempo=${a.time_ms}ms modo=${a.mode} dificuldade=${a.difficulty}`);

const xp = await sql`select kind, amount, ref_text from xp_events where user_id = ${uid} order by created_at`;
console.log(`XP_EVENTS (${xp.length}):`);
for (const x of xp) console.log(`  ${x.kind}: +${x.amount} XP`);

const streak = await sql`select current, longest, freezes_available from streaks where user_id = ${uid}`;
console.log("STREAK:", JSON.stringify(streak[0]));

const mastery = await sql`
  select t.slug, m.elo, m.attempts_count, m.last_attempt_at is not null as visto
  from topic_mastery m join topics t on t.id = m.topic_id
  where m.user_id = ${uid}
`;
console.log(`TOPIC_MASTERY (${mastery.length}):`);
for (const m of mastery) console.log(`  ${m.slug}: elo=${Math.round(m.elo)} tentativas=${m.attempts_count}`);

const srs = await sql`
  select q.statement_md, c.state, c.stability, c.difficulty_fsrs, c.reps, c.learning_steps, c.due
  from srs_cards c join questions q on q.id = c.question_id
  where c.user_id = ${uid}
`;
console.log(`SRS_CARDS (${srs.length}):`);
for (const c of srs) {
  console.log(
    `  "${c.statement_md.slice(0, 40)}...": estado=${c.state} estabilidade=${Math.round(c.stability)} reps=${c.reps} passos=${c.learning_steps} vence=${new Date(c.due).toISOString().slice(0, 16)}`,
  );
}

const sessions = await sql`
  select mode, questions_answered, correct_count, xp_earned, duration_s from study_sessions where user_id = ${uid} order by started_at desc limit 3
`;
console.log(`STUDY_SESSIONS (${sessions.length}):`);
for (const s of sessions) console.log(`  ${s.mode}: ${s.questions_answered} questões, ${s.correct_count} corretas, +${s.xp_earned} XP, ${s.duration_s}s`);

await sql.end();
