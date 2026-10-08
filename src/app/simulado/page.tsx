import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BookOpen, FlaskConical, Timer } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { StartExamButtons } from "@/components/mock-exam/start-exam-buttons";
import { getSupabaseServerClient } from "@/lib/db/server";

export const metadata: Metadata = { title: "Simulados" };
export const dynamic = "force-dynamic";

/** Mock exam picker + history (doc section 6.9). */
export default async function SimuladoPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: exams }] = await Promise.all([
    supabase.from("profiles").select("apelido, onboarding_completed").eq("id", user.id).single(),
    supabase
      .from("mock_exams")
      .select("id, kind, status, started_at, score_estimate")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(8),
  ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const kindLabel: Record<string, string> = {
    partial: "Parcial (12 questões)",
    day1: "Dia 1 — Linguagens + Humanas",
    day2: "Dia 2 — Natureza + Matemática",
  };

  return (
    <AppShell apelido={profile.apelido}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Simulados</h1>
          <p className="text-sm text-muted-foreground">
            Formato real do ENEM: dia 1 (Linguagens + Humanas + Redação) e
            dia 2 (Natureza + Matemática). O parcial é o treino rápido do dia
            a dia. Relatórios por área ao final.
          </p>
        </header>

        <StartExamButtons />

        <section className="mt-8" aria-label="Histórico de simulados">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Seus simulados
          </h2>
          {exams && exams.length > 0 ? (
            <ul className="space-y-2">
              {exams.map((exam) => {
                const estimate = exam.score_estimate as
                  | { correct?: number; total?: number; estimated?: number }
                  | null;
                return (
                  <li key={exam.id}>
                    <Link
                      href={`/simulado/${exam.id}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/60"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {kindLabel[exam.kind] ?? exam.kind}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(exam.started_at).toLocaleDateString("pt-BR")} ·{" "}
                          {exam.status === "finished"
                            ? "concluído"
                            : "em andamento"}
                        </p>
                      </div>
                      {exam.status === "finished" && estimate ? (
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold tabular-nums text-primary">
                          {estimate.correct}/{estimate.total}
                        </span>
                      ) : (
                        <Timer className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhum simulado ainda — comece pelo parcial (25 minutos).
            </p>
          )}
        </section>

        <div className="mt-8 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            Domingo é dia de simulado no plano
          </span>
          <span className="flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
            Estimativas são rotuladas — não são TRI
          </span>
        </div>
      </div>
    </AppShell>
  );
}
