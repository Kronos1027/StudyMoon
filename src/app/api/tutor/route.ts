import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/server";
import { getSupabaseAdmin } from "@/lib/db/admin";
import { routeLlmCached } from "@/lib/ai/router";
import { tutorPrompt } from "@/lib/ai/prompts";
import { tutorSchema } from "@/lib/ai/schemas";
import { extractJson } from "@/lib/ai/providers/types";
import { createHash } from "node:crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TUTOR_DAILY_LIMIT = 20;

const bodySchema = z.object({
  questionId: z.string().uuid(),
  studentQuestion: z.string().min(3).max(600),
  hintLevel: z.number().int().min(0).max(3).default(0),
});

/**
 * Socratic tutor endpoint (doc section 9). The student's text is passed as
 * DATA, never as instructions (prompt-injection protection). Rate limited with an atomic PostgreSQL reservation to
 * TUTOR_DAILY_LIMIT per user per UTC day; identical questions hit the cache.
 */
export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { questionId, studentQuestion, hintLevel } = parsed.data;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  // Fetch the question (server-only full row via admin).
  const { data: question } = await admin
    .from("questions")
    .select("id, topic_id, context_md, statement_md, alternatives")
    .eq("id", questionId)
    .eq("status", "validated")
    .single();
  if (!question) {
    return NextResponse.json({ error: "question_not_found" }, { status: 404 });
  }

  const { data: topic } = await admin
    .from("topics")
    .select("name")
    .eq("id", question.topic_id)
    .single();

  // The SQL RPC atomically reserves a slot *before* invoking any provider.
  // Use a consistent UTC calendar day across all server instances.
  const usageDate = new Date().toISOString().slice(0, 10);
  const quotaArgs = { p_user_id: user.id, p_usage_date: usageDate };
  const { data: allowed, error: quotaError } = await admin.rpc(
    "claim_tutor_daily_turn",
    { ...quotaArgs, p_daily_limit: TUTOR_DAILY_LIMIT },
  );
  if (quotaError) {
    console.error("[tutor] quota reservation failed:", quotaError.message);
    return NextResponse.json(
      { error: "quota_unavailable", message: "O tutor está indisponível no momento. Tente novamente." },
      { status: 503 },
    );
  }
  if (allowed !== true) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `Você já usou o tutor ${TUTOR_DAILY_LIMIT} vezes hoje (UTC). Volte amanhã — ou reveja as dicas da questão!`,
      },
      { status: 429 },
    );
  }

  async function releaseSlot() {
    const { error } = await admin.rpc("release_tutor_daily_turn", quotaArgs);
    if (error) console.error("[tutor] quota release failed:", error.message);
  }

  const messages = tutorPrompt({
    topicName: topic?.name ?? "Tópico",
    questionContext: question.context_md,
    questionStatement: question.statement_md,
    alternatives: question.alternatives ?? [],
    studentQuestion,
    hintLevel,
  });

  const cacheKey = createHash("sha256")
    .update(`tutor-v1:${questionId}:${hintLevel}:${studentQuestion}`)
    .digest("hex");

  let text: string;
  try {
    const response = await routeLlmCached(cacheKey, {
      messages,
      json: true,
      temperature: 0.5,
      timeoutMs: 25_000,
    });
    text = response.text;
  } catch (err) {
    await releaseSlot();
    console.error("[tutor] router failed:", (err as Error).message);
    return NextResponse.json(
      { error: "ai_unavailable", message: "O tutor está ocupado agora. Tente de novo em instantes." },
      { status: 503 },
    );
  }

  let parsedReply: z.infer<typeof tutorSchema>;
  try {
    parsedReply = tutorSchema.parse(extractJson(text));
  } catch {
    await releaseSlot();
    console.error("[tutor] invalid model output");
    return NextResponse.json(
      { error: "ai_invalid", message: "O tutor se atrapalhou — pode perguntar de outro jeito?" },
      { status: 502 },
    );
  }

  // Keep best-effort usage history; the actual quota lives in tutor_daily_usage.
  await admin.from("ai_cache").insert({
    prompt_hash: `t:${user.id}:${Date.now()}:${cacheKey.slice(0, 40)}`,
    response: { ...parsedReply, questionId },
    model: `tutor:${user.id}`,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  });

  return NextResponse.json({
    reply: parsedReply.reply,
    gaveAnswer: parsedReply.gave_answer,
  });
}
