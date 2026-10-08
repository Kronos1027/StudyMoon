import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarDays, Flame, Sparkles, Zap } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { getSupabaseServerClient } from "@/lib/db/server";

export const metadata: Metadata = { title: "Painel" };

/**
 * Phase 1 minimal dashboard with REAL database data.
 * Phase 2 replaces the layout with the full dashboard
 * (goal ring, consistency map, charts).
 */
export default async function PainelPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: streak }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("streaks").select("*").eq("user_id", user.id).single(),
  ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const daysLeft = profile.target_exam_date
    ? Math.max(
        0,
        Math.ceil(
          (new Date(profile.target_exam_date + "T00:00:00").getTime() -
            Date.now()) /
            86400000,
        ),
      )
    : null;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Olá, {profile.apelido}
          </h1>
          <p className="text-sm text-muted-foreground">
            {profile.rank_title} · Nível {profile.level}
          </p>
        </div>
        <LogoutButton />
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Zap className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">XP total</span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-accent-1-ink">
            {profile.xp}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">Sequência</span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-accent-2-ink">
            {streak?.current ?? 0} dias
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">Para a prova</span>
          </div>
          <p className="mt-2 text-3xl font-semibold">
            {daysLeft !== null ? `${daysLeft} dias` : "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          <p className="text-sm">
            Painel completo em construção (Fase 2): anel da meta do dia, mapa de
            constância e domínio por área.
          </p>
        </div>
      </div>
    </main>
  );
}
