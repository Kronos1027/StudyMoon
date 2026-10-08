"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/server";

const onboardingSchema = z.object({
  targetExamDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyHours: z.number().min(0.5).max(10),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
  targetScore: z.number().min(0).max(1000).nullable(),
  notifyPush: z.boolean(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Persists onboarding answers to the user's own profile row. */
export async function completeOnboarding(
  input: OnboardingInput,
): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos. Revise as respostas." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada. Entre novamente." };

  const { error } = await supabase
    .from("profiles")
    .update({
      target_exam_date: parsed.data.targetExamDate,
      daily_hours: parsed.data.dailyHours,
      preferred_study_time: parsed.data.preferredTime,
      target_score: parsed.data.targetScore,
      notify_push: parsed.data.notifyPush,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("[onboarding] update failed:", error.message);
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/painel");
  return { ok: true };
}
