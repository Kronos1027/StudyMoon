/**
 * RLS verification (doc section 5/15): creates two throwaway users via the
 * admin API, signs in as each with the anon key and asserts that:
 *   1. User A cannot read user B's profile/attempts/streaks
 *   2. User A CAN read public curriculum (areas/topics/questions)
 *   3. User A CANNOT read questions' answer_key (column grant)
 *   4. User A CANNOT write xp/attempts (system tables)
 *   5. Anon (unauthenticated) cannot read anything protected
 * Exits 0 when every assertion passes.
 * Run: pnpm db:test-rls  (requires NEXT_PUBLIC_SUPABASE_URL + keys)
 */
import { createClient } from "@supabase/supabase-js";

let failures = 0;
function check(name: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${name}`);
  if (!condition) failures++;
}

const stamp = Date.now();
const emailA = `rls-a-${stamp}@studymoon.test`;
const emailB = `rls-b-${stamp}@studymoon.test`;
const password = `MoonRLS-${stamp}!9`;
const created: string[] = [];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !anon || !secret) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SECRET_KEY",
    );
    process.exit(1);
  }
  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // --- create users ---
  // Always remove throwaway identities, even when an assertion throws.
  try {
  const userA = await admin.auth.admin.createUser({
    email: emailA,
    password,
    email_confirm: true,
    user_metadata: { apelido: "TesteA" },
  });
  const userB = await admin.auth.admin.createUser({
    email: emailB,
    password,
    email_confirm: true,
    user_metadata: { apelido: "TesteB" },
  });
  if (userA.data.user) created.push(userA.data.user.id);
  if (userB.data.user) created.push(userB.data.user.id);
  if (userA.error || userB.error || !userA.data.user || !userB.data.user) {
    throw new Error(`RLS setup failed: ${userA.error?.message ?? ""} ${userB.error?.message ?? ""}`);
  }

  // --- sign in as A and B (anon-key clients, like a real browser) ---
  const clientA = createClient(url, anon);
  const clientB = createClient(url, anon);
  await clientA.auth.signInWithPassword({ email: emailA, password });
  await clientB.auth.signInWithPassword({ email: emailB, password });

  const idA = userA.data.user.id;
  const idB = userB.data.user.id;

  // 1. isolation: A cannot read B's rows
  const bProfile = await clientA.from("profiles").select("*").eq("id", idB);
  check("A não lê o perfil de B", bProfile.data?.length === 0);

  const bAttempts = await clientA.from("attempts").select("*").eq("user_id", idB);
  check("A não lê tentativas de B", bAttempts.data?.length === 0);

  const bStreak = await clientA.from("streaks").select("*").eq("user_id", idB);
  check("A não lê sequência de B", bStreak.data?.length === 0);

  // 2. public curriculum readable by authenticated users
  const areas = await clientA.from("areas").select("id").limit(1);
  check("A lê áreas (currículo público)", !areas.error);

  // 3. answer_key must not come to the client
  const questions = await clientA
    .from("questions")
    .select("id, answer_key")
    .limit(1);
  check(
    "answer_key não vaza para o cliente",
    Boolean(questions.error) &&
      (questions.error?.code === "42501" ||
        /permission denied|not permitted|forbidden/i.test(questions.error?.message ?? "")),
  );
  // The two fields required by getNextQuestion() MUST be readable. A migration
  // that forgets these grants makes the entire practice session fail.
  const demoMetadata = await clientA
    .from("questions")
    .select("id, subtopic, demo_params")
    .limit(1);
  check("metadados seguros da demo são legíveis", !demoMetadata.error);
  const numericKey = await clientA.from("questions").select("id, numeric_expr").limit(1);
  check("numeric_expr (possível resultado) não vaza", Boolean(numericKey.error));
  const qPublic = await clientA
    .from("questions")
    .select("id, statement_md, alternatives")
    .limit(1);
  check("questão pública (sem gabarito) é legível", !qPublic.error);

  // 4. system-of-record tables are not client-writable
  const xpInsert = await clientA.from("xp_events").insert({
    user_id: idA,
    amount: 999999,
    kind: "question",
  });
  check("A não insere XP diretamente", Boolean(xpInsert.error));

  const attemptInsert = await clientA.from("attempts").insert({
    user_id: idA,
    question_id: "00000000-0000-0000-0000-000000000000",
    selected: "A",
    correct: true,
  });
  check("A não insere tentativas diretamente", Boolean(attemptInsert.error));

  const selfXp = await clientA
    .from("profiles")
    .update({ xp: 999999, level: 99 })
    .eq("id", idA);
  check("A não se auto-atribui XP/nível", Boolean(selfXp.error));

  // 5. anon cannot read protected tables
  const anonClient = createClient(url, anon);
  const anonProfiles = await anonClient.from("profiles").select("id").limit(1);
  check("anônimo não lê perfis", anonProfiles.data?.length === 0);

  console.log(
    failures === 0
      ? "\nRLS: todas as verificações passaram."
      : `\nRLS: ${failures} verificação(ões) FALHARAM.`,
  );
  if (failures > 0) process.exitCode = 1;
  } finally {
    for (const id of created) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) {
        console.error("RLS test cleanup failed for", id, error.message);
        process.exitCode = 1;
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
