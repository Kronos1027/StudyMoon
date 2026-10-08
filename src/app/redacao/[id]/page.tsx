import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Markdown } from "@/components/content/markdown";
import { getSupabaseServerClient } from "@/lib/db/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params;
  return { title: "Redação" };
}

/** Essay detail: text + correction result (when corrected). */
export default async function EssayDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: essay }, { data: profile }] = await Promise.all([
    supabase
      .from("essays")
      .select("id, user_id, prompt_title, content_md, status, mode, created_at, word_count")
      .eq("id", id)
      .single(),
    supabase.from("profiles").select("apelido").eq("id", user.id).single(),
  ]);

  if (!essay) notFound();

  const { data: feedback } = await supabase
    .from("essay_feedback")
    .select("total_score, competencies, improvements, highlights, rewrite_example_md, model_used")
    .eq("essay_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <AppShell apelido={profile?.apelido ?? ""}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <Link
          href="/redacao"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para redações
        </Link>

        <header className="mb-5">
          <h1 className="text-xl font-semibold leading-snug">{essay.prompt_title}</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(essay.created_at).toLocaleDateString("pt-BR")} ·{" "}
            {essay.mode === "training" ? "treino" : "prova"} ·{" "}
            {essay.word_count} palavras ·{" "}
            {essay.status === "corrected" ? "corrigida" : "rascunho"}
          </p>
        </header>

        {feedback ? (
          <div className="mb-6 rounded-2xl bg-brand-gradient p-6 text-center text-white">
            <p className="text-sm uppercase tracking-wide opacity-90">
              Estimativa feita por IA ({feedback.model_used})
            </p>
            <p className="mt-1 text-5xl font-bold tabular-nums">
              {feedback.total_score}
            </p>
            <p className="mt-1 text-sm opacity-90">
              de 1000 · a nota real vem dos avaliadores do INEP
            </p>
          </div>
        ) : null}

        {feedback ? (
          <div className="mb-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">
              Competências
            </h2>
            <div className="space-y-3">
              {((feedback.competencies as Array<{ key: string; score: number; justification: string }>) ?? []).map(
                (c) => (
                  <div key={c.key} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium">{c.key}</span>
                      <span className="tabular-nums">{c.score}/200</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {c.justification}
                    </p>
                  </div>
                ),
              )}
            </div>
            {((feedback.improvements as string[]) ?? []).length > 0 ? (
              <>
                <h3 className="mb-2 mt-5 text-sm font-medium text-muted-foreground">
                  3 melhorias priorizadas
                </h3>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm">
                  {((feedback.improvements as string[]) ?? []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              </>
            ) : null}
          </div>
        ) : null}

        <section className="rounded-2xl border border-border bg-card p-5" aria-label="Sua redação">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Sua redação
          </h2>
          {essay.content_md ? (
            <Markdown content={essay.content_md} />
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Rascunho em branco.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
