import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { getSupabaseServerClient } from "@/lib/db/server";

export const metadata: Metadata = { title: "Escrever redação" };
export const dynamic = "force-dynamic";

/** Mode picker → creates the essay and opens the editor. */
export default async function EscreverRedacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tema?: string }>;
}) {
  const { tema } = await searchParams;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!tema) redirect("/redacao");

  const { data: theme } = await supabase
    .from("essay_themes")
    .select("id, title, texts_motivadores, kind")
    .eq("id", tema)
    .eq("status", "validated")
    .single();
  if (!theme) redirect("/redacao");

  return (
    <AppShell apelido="">
      <ModePicker
        themeId={theme.id}
        title={theme.title}
        kind={theme.kind ?? ""}
      />
    </AppShell>
  );
}

async function ModePicker({
  themeId,
  title,
  kind,
}: {
  themeId: string;
  title: string;
  kind: string;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {kind}
      </p>
      <h1 className="mt-1 text-2xl font-semibold leading-snug">{title}</h1>
      <p className="mt-6 mb-2 text-sm font-medium text-muted-foreground">
        Como você quer escrever?
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <ModeCard
          href={`/redacao/nova?tema=${themeId}&modo=treino`}
          title="Modo treino"
          description="Timer de 30 minutos para simular o tempo, mas com avisos visuais e correção imediata ao enviar."
          highlighted
        />
        <ModeCard
          href={`/redacao/nova?tema=${themeId}&modo=prova`}
          title="Modo prova"
          description="Sem cronômetro e sem qualquer ajuda: você escreve, envia e só então recebe a correção — como no dia do exame."
        />
      </div>
    </div>
  );
}

function ModeCard({
  href,
  title,
  description,
  highlighted,
}: {
  href: string;
  title: string;
  description: string;
  highlighted?: boolean;
}) {
  return (
    <a
      href={href}
      className={
        highlighted
          ? "rounded-2xl bg-brand-gradient p-5 text-white transition-transform hover:scale-[1.01]"
          : "rounded-2xl border-2 border-border bg-card p-5 transition-colors hover:border-primary/60"
      }
    >
      <p className="text-lg font-semibold">{title}</p>
      <p
        className={`mt-2 text-sm leading-relaxed ${
          highlighted ? "text-white/85" : "text-muted-foreground"
        }`}
      >
        {description}
      </p>
    </a>
  );
}
