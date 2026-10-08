import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { FileText, PenLine, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { getSupabaseServerClient } from "@/lib/db/server";

export const metadata: Metadata = { title: "Redação" };
export const dynamic = "force-dynamic";

/** Essay home: theme bank + history (doc section 6.10). */
export default async function RedacaoPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: themes }, { data: essays }] =
    await Promise.all([
      supabase.from("profiles").select("apelido, onboarding_completed").eq("id", user.id).single(),
      supabase
        .from("essay_themes")
        .select("id, title, kind")
        .eq("status", "validated")
        .limit(12),
      supabase
        .from("essays")
        .select("id, prompt_title, status, mode, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <AppShell apelido={profile.apelido}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Redação</h1>
          <p className="text-sm text-muted-foreground">
            Um tema por semana no plano. Modo treino: timer de 30 minutos.
            Modo prova: condições reais, sem ajuda até enviar.
          </p>
        </header>

        {/* Themes */}
        <section aria-label="Temas disponíveis" className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Temas no estilo ENEM
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(themes ?? []).map((theme) => (
              <Link
                key={theme.id}
                href={`/redacao/escrever?tema=${theme.id}`}
                className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {theme.kind}
                </p>
                <p className="mt-1 font-medium leading-snug">{theme.title}</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-primary">
                  <PenLine className="h-3.5 w-3.5" aria-hidden="true" />
                  Escrever agora
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* History */}
        <section aria-label="Histórico de redações">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Suas redações
          </h2>
          {essays && essays.length > 0 ? (
            <ul className="space-y-2">
              {essays.map((essay) => (
                <li key={essay.id}>
                  <Link
                    href={`/redacao/${essay.id}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {essay.prompt_title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(essay.created_at).toLocaleDateString("pt-BR")} ·{" "}
                        {essay.mode === "training" ? "treino" : "prova"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        essay.status === "corrected"
                          ? "bg-success/10 text-success"
                          : essay.status === "correcting"
                            ? "bg-accent-2/10 text-accent-2-ink"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {essay.status === "corrected"
                        ? "corrigida"
                        : essay.status === "correcting"
                          ? "corrigindo"
                          : "rascunho"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma redação ainda — a primeira vale XP e destrava a medalha
              Escriba Lunar.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
