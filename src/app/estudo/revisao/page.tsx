import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { getSupabaseServerClient } from "@/lib/db/server";

export const metadata: Metadata = { title: "Revisão do dia" };
export const dynamic = "force-dynamic";

/** FSRS review queue: cards due today (doc section 6.8). */
export default async function RevisaoPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("apelido, onboarding_completed")
    .eq("id", user.id)
    .single();
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const { data: dueCards } = await supabase
    .from("srs_cards")
    .select("id, question_id, due, reps, lapses, state")
    .eq("user_id", user.id)
    .lte("due", new Date().toISOString())
    .order("due")
    .limit(200);

  const due = dueCards ?? [];

  return (
    <AppShell apelido={profile.apelido}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Revisão do dia</h1>
          <p className="text-sm text-muted-foreground">
            O algoritmo de repetição espaçada escolheu o que você está prestes
            a esquecer — revisar agora vale mais que estudar coisa nova.
          </p>
        </header>

        {due.length > 0 ? (
          <>
            <div className="mb-6 flex items-center justify-between rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-2/15 text-accent-2-ink">
                  <RefreshCw className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tabular-nums">{due.length}</p>
                  <p className="text-sm text-muted-foreground">
                    {due.length === 1 ? "cartão vencendo" : "cartões vencendo hoje"}
                  </p>
                </div>
              </div>
              <Link
                href="/estudo/pratica?modo=revisao"
                className="rounded-xl bg-brand-gradient px-5 py-3 font-medium text-white transition-transform hover:scale-[1.02]"
              >
                Revisar agora
              </Link>
            </div>

            <section aria-label="Estatísticas da fila">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                  {due.filter((c) => c.state === "learning").length} em aprendizado (erradas recentemente)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                  {due.filter((c) => c.state === "review").length} em manutenção de longo prazo
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                  {due.filter((c) => c.lapses > 0).length} já esquecidas alguma vez
                </li>
              </ul>
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">Tudo revisado!</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Nenhum cartão vence hoje. Responda novas questões para o
                algoritmo agendar as próximas revisões.
              </p>
            </div>
            <Link
              href="/estudo"
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:border-primary/60"
            >
              Estudar algo novo
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
