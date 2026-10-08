"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/server";
import { getSupabaseAdmin } from "@/lib/db/admin";
import { routeLlmCached } from "@/lib/ai/router";
import { essayCorrectionPrompt } from "@/lib/ai/prompts";
import { essayCorrectionSchema } from "@/lib/ai/schemas";
import { extractJson } from "@/lib/ai/providers/types";
import { createHash } from "node:crypto";
import { FIXED_XP } from "@/lib/gamification/xp";

const submitSchema = z.object({
  essayId: z.string().uuid(),
});

export interface EssayCorrectionResult {
  ok: boolean;
  error?: string;
  totalScore?: number;
  competencies?: Array<{ key: string; score: number; justification: string }>;
  improvements?: string[];
  highlights?: Array<{ text: string; note: string }>;
  rewriteExample?: string | null;
  zeroReason?: string | null;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Corrects an essay with the official ENEM rubric via the AI router
 * (doc section 9). Output is Zod-validated and stored in essay_feedback.
 * Always labeled as an AI ESTIMATE in the UI.
 */
export async function correctEssay(
  input: z.infer<typeof submitSchema>,
): Promise<EssayCorrectionResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "Serviço indisponível." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: essay } = await supabase
    .from("essays")
    .select("id, user_id, theme_id, prompt_title, content_md, word_count, status")
    .eq("id", parsed.data.essayId)
    .single();
  if (!essay || essay.user_id !== user.id) {
    return { ok: false, error: "Redação não encontrada." };
  }
  if (essay.status === "corrected") {
    return { ok: false, error: "Esta redação já foi corrigida." };
  }
  if (countWords(essay.content_md) < 30) {
    return {
      ok: false,
      error: "Escreva pelo menos 30 palavras antes de enviar para correção.",
    };
  }

  const { data: theme } = essay.theme_id
    ? await admin
        .from("essay_themes")
        .select("title, texts_motivadores")
        .eq("id", essay.theme_id)
        .single()
    : { data: null };

  const motivatingTexts = theme
    ? ((theme.texts_motivadores as Array<{ source: string; text: string }>) ?? [])
        .map((t) => `[${t.source}] ${t.text}`)
        .join("\n\n")
    : "(tema sem textos motivadores cadastrados)";

  const messages = essayCorrectionPrompt({
    themeTitle: essay.prompt_title,
    motivatingTexts,
    essay: essay.content_md,
  });

  const cacheKey = createHash("sha256")
    .update(`essay-v1:${essay.prompt_title}:${essay.content_md}`)
    .digest("hex");

  await admin
    .from("essays")
    .update({ status: "correcting" })
    .eq("id", essay.id);

  try {
    const response = await routeLlmCached(cacheKey, {
      messages,
      json: true,
      temperature: 0.15,
      timeoutMs: 55_000,
      maxTokens: 4096,
    });

    const correction = essayCorrectionSchema.parse(extractJson(response.text));

    await admin.from("essay_feedback").insert({
      essay_id: essay.id,
      total_score: correction.total_score,
      competencies: correction.competencies,
      highlights: correction.highlights,
      improvements: correction.improvements,
      rewrite_example_md: correction.rewrite_example_md,
      is_ai_estimate: true,
      model_used: response.provider,
    });
    await admin
      .from("essays")
      .update({ status: "corrected" })
      .eq("id", essay.id);

    const { count: alreadyPaid } = await admin
      .from("xp_events")
      .select("amount", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("kind", "essay")
      .eq("ref_id", essay.id);
    if ((alreadyPaid ?? 0) === 0) {
      const { error: xpError } = await admin.from("xp_events").insert({
        user_id: user.id,
        amount: FIXED_XP.essaySubmitted,
        kind: "essay",
        ref_id: essay.id,
      });
      if (!xpError) {
        const { data: profile } = await admin
          .from("profiles")
          .select("xp")
          .eq("id", user.id)
          .single();
        if (profile) {
          await admin
            .from("profiles")
            .update({ xp: profile.xp + FIXED_XP.essaySubmitted })
            .eq("id", user.id);
        }
      }
    }

    revalidatePath("/redacao");

    return {
      ok: true,
      totalScore: correction.total_score,
      competencies: correction.competencies,
      improvements: correction.improvements,
      highlights: correction.highlights,
      rewriteExample: correction.rewrite_example_md,
      zeroReason: correction.zero_reason,
    };
  } catch (err) {
    await admin
      .from("essays")
      .update({ status: "submitted" })
      .eq("id", essay.id);
    console.error("[essay] correction failed:", (err as Error).message);
    return {
      ok: false,
      error:
        "A correção falhou agora (provedores ocupados). Sua redação está salva — tente novamente em instantes.",
    };
  }
}

const draftSchema = z.object({
  essayId: z.string().uuid(),
  content: z.string().max(20_000),
});

export async function saveEssayDraft(
  input: z.infer<typeof draftSchema>,
): Promise<{ ok: boolean }> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("essays")
    .update({
      content_md: parsed.data.content,
      word_count: countWords(parsed.data.content),
    })
    .eq("id", parsed.data.essayId)
    .eq("user_id", user.id);
  return { ok: true };
}

const createSchema = z.object({
  themeId: z.string().uuid(),
  mode: z.enum(["training", "exam"]).default("training"),
});

export async function createEssay(
  input: z.infer<typeof createSchema>,
): Promise<{ ok: true; essayId: string } | { ok: false; error: string }> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { data: theme } = await supabase
    .from("essay_themes")
    .select("id, title")
    .eq("id", parsed.data.themeId)
    .eq("status", "validated")
    .single();
  if (!theme) return { ok: false, error: "Tema não encontrado." };

  const { data: essay, error } = await supabase
    .from("essays")
    .insert({
      user_id: user.id,
      theme_id: theme.id,
      prompt_title: theme.title,
      content_md: "",
      mode: parsed.data.mode,
    })
    .select("id")
    .single();

  if (error || !essay) {
    return { ok: false, error: "Não foi possível começar a redação." };
  }
  return { ok: true, essayId: essay.id };
}
