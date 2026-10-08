import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Trophy } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { getSupabaseServerClient } from "@/lib/db/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params;
  return { title: "Relatório do simulado" };
}

interface ScoreEstimate {
  correct?: number;
  total?: number;
  estimated?: number;
  note?: string;
  byArea?: Array<{ area: string; correct: number; total: number }>;
}

/** Mock exam report (doc section 6.9): per-area breakdown + estimate. */
export default async function ExamReportPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: exam }, { data: profile }] = await Promise.all([
    supabase.from("mock_exams").select("*").eq("id", id).single(),
    supabase.from("profiles").select("apelido").eq("id", user.id).single(),
  ]);
  if (!exam || exam.user_id !== user.id) notFound();

  const kindLabel: Record<string, string> = {
    partial: "Simulado parcial",
    day1: "Dia 1 — Linguagens + Humanas",
    day2: "Dia 2 — Natureza + Matemática",
  };

  const estimate = (exam.score_estimate ?? null) as ScoreEstimate | null;
  const finished = exam.status === "finished";

  return (
    <AppShell apelido={profile?.apelido ?? ""}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <Link
          href="/simulado"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para simulados
        </Link>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            {kindLabel[exam.kind] ?? "Simulado"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date(exam.started_at).toLocaleDateString("pt-BR")} ·{" "}
            {finished ? "concluído" : "em andamento"}
          </p>
        </header>

        {finished && estimate ? (
          <>
            <div className="mb-6 rounded-2xl bg-brand-gradient p-6 text-center text-white">
              <p className="flex items-center justify-center gap-2 text-sm uppercase tracking-wide opacity-90">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                {estimate.correct}/{estimate.total} acertos
              </p>
              <p className="mt-1 text-5xl font-bold tabular-nums">
                {estimate.estimated}
              </p>
              <p className="mt-1 text-xs opacity-90">
                estimativa simples (percentual × 1000) — NÃO é a nota TRI do
                INEM
              </p>
            </div>

            <section className="rounded-2xl border border-border bg-card p-5" aria-label="Desempenho por área">
              <h2 className="mb-4 text-sm font-medium text-muted-foreground">
                Desempenho por área
              </h2>
              <div className="space-y-4">
                {(estimate.byArea ?? []).map((row) => {
                  const percent = Math.round((row.correct / row.total) * 100);
                  return (
                    <div key={row.area}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium">{row.area}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {row.correct}/{row.total} · {percent}%
                        </span>
                      </div>
                      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-brand-gradient"
                          style={{ width: `${Math.max(3, percent)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="mt-6 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              <p>
                Os pontos fracos detectados já entraram no seu plano: a
                prática adaptativa prioriza os tópicos com menor desempenho
                deste simulado.
              </p>
              <Link
                href="/estudo/pratica"
                className="mt-3 inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                Treinar os pontos fracos
              </Link>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Este simulado ainda não foi finalizado. Volte ao{" "}
            <Link href="/simulado" className="text-primary hover:underline">
              painel de simulados
            </Link>{" "}
            para retomá-lo.
          </div>
        )}
      </div>
    </AppShell>
  );
}
