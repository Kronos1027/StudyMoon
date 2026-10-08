"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/db/server";
import { getSupabaseAdmin } from "@/lib/db/admin";

const settingsSchema = z.object({
  apelido: z.string().min(2).max(24),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetExamDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dailyHours: z.number().min(0.5).max(10),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
  notifyPush: z.boolean(),
  weeklySummary: z.boolean(),
  overloadGuard: z.boolean(),
});

export type ProfileActionResult = { ok: true } | { ok: false; error: string };

/** Saves profile settings (columns allowed by the grants). */
export async function updateProfileSettings(
  input: z.infer<typeof settingsSchema>,
): Promise<ProfileActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Dados inválidos. Revise os campos." };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  const { error } = await supabase
    .from("profiles")
    .update({
      apelido: parsed.data.apelido,
      birth_date: parsed.data.birthDate,
      target_exam_date: parsed.data.targetExamDate,
      daily_hours: parsed.data.dailyHours,
      preferred_study_time: parsed.data.preferredTime,
      notify_push: parsed.data.notifyPush,
      weekly_summary: parsed.data.weeklySummary,
      overload_guard: parsed.data.overloadGuard,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("[profile] update failed:", error.message);
    return { ok: false, error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/perfil");
  revalidatePath("/painel");
  return { ok: true };
}

/**
 * LGPD erasure (doc section 14): deletes the auth user — the ON DELETE
 * CASCADE wipes every personal row.
 */
export async function deleteAccount(): Promise<ProfileActionResult> {
  const supabase = await getSupabaseServerClient();
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "Serviço indisponível." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sessão expirada." };

  // Sign out first, then remove the auth user (cascades all personal data).
  await supabase.auth.signOut();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[profile] delete failed:", error.message);
    return { ok: false, error: "Não foi possível apagar agora. Tente mais tarde." };
  }
  return { ok: true };
}
