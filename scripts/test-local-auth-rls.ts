/**
 * End-to-end Auth/RLS smoke test for an EPHEMERAL Supabase CLI instance only.
 * This file must never run against a hosted Supabase project.
 * The production/staging scripts retain their strict staging guards.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";

if (url !== "http://127.0.0.1:54321" || !anonKey || !secretKey
    || process.env.CI !== "true") {
  throw new Error("Bloqueado: este teste só pode usar o Supabase local do GitHub Actions.");
}

const admin = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users: string[] = [];
let failed = false;

function assert(name: string, condition: boolean): void {
  console.log(`${condition ? "PASS" : "FAIL"} — ${name}`);
  if (!condition) failed = true;
}

async function run(): Promise<void> {
  const tag = Date.now().toString(36);
  const emailA = `local-a-${tag}@studymoon.test`;
  const emailB = `local-b-${tag}@studymoon.test`;
  const password = `StudyMoon-CI-${tag}!a4`;

  try {
    const createdA = await admin.auth.admin.createUser({
      email: emailA, password, email_confirm: true,
      user_metadata: { apelido: "LocalTestA" },
    });
    if (createdA.data.user) users.push(createdA.data.user.id);
    if (createdA.error || !createdA.data.user) {
      throw new Error(`Create A failed: ${createdA.error?.message ?? "missing user"}`);
    }

    const createdB = await admin.auth.admin.createUser({
      email: emailB, password, email_confirm: true,
      user_metadata: { apelido: "LocalTestB" },
    });
    if (createdB.data.user) users.push(createdB.data.user.id);
    if (createdB.error || !createdB.data.user) {
      throw new Error(`Create B failed: ${createdB.error?.message ?? "missing user"}`);
    }

    const userA = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userB = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [authA, authB] = await Promise.all([
      userA.auth.signInWithPassword({ email: emailA, password }),
      userB.auth.signInWithPassword({ email: emailB, password }),
    ]);

    if (authA.error || authB.error
        || authA.data.user?.id !== createdA.data.user.id
        || authB.data.user?.id !== createdB.data.user.id
        || !authA.data.session || !authB.data.session) {
      throw new Error("Local Supabase Auth did not authenticate both test users.");
    }
    assert("Login real de dois estudantes", true);

    const idA = createdA.data.user.id;
    const idB = createdB.data.user.id;
    const own = await userA.from("profiles").select("id").eq("id", idA).single();
    assert("Estudante vê seu próprio perfil", !own.error && own.data?.id === idA);

    const other = await userA.from("profiles").select("id").eq("id", idB);
    assert("Estudante não vê perfil alheio", !other.error && other.data?.length === 0);

    const otherStreak = await userA.from("streaks").select("user_id").eq("user_id", idB);
    assert("Estudante não vê sequência alheia",
      !otherStreak.error && otherStreak.data?.length === 0);

    const catalog = await userA.from("areas").select("id").limit(1);
    assert("Currículo pode ser consultado", !catalog.error);

    const safeDemo = await userA.from("questions").select("id, subtopic, demo_params").limit(1);
    assert("Metadados seguros das questões acessíveis", !safeDemo.error);

    const leakedKey = await userA.from("questions").select("answer_key").limit(1);
    assert("Gabarito das questões protegido", Boolean(leakedKey.error));

    const leakedExpr = await userA.from("questions").select("numeric_expr").limit(1);
    assert("Expressão numérica de correção protegida", Boolean(leakedExpr.error));

    const forgedXp = await userA.from("xp_events").insert({
      user_id: idA, amount: 500, kind: "question",
    });
    assert("Estudante não pode criar XP", Boolean(forgedXp.error));

    const forgedSelf = await userA.from("profiles")
      .update({ xp: 99999, level: 99 }).eq("id", idA);
    assert("Estudante não pode alterar seu próprio XP", Boolean(forgedSelf.error));

    const anonClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const publicProfiles = await anonClient.from("profiles").select("id");
    assert("Anônimo não lê perfis", !publicProfiles.error && publicProfiles.data?.length === 0);

    if (failed) throw new Error("Local Supabase Auth / RLS assertions failed.");
    console.log("All local Auth / RLS integration checks passed.");
  } finally {
    for (const userId of users) {
      const result = await admin.auth.admin.deleteUser(userId);
      if (result.error) {
        failed = true;
        console.error("Test user cleanup failed:", result.error.message);
      }
    }
    if (failed) process.exitCode = 1;
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
