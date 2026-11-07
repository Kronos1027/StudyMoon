import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { EssayModePicker } from "@/components/essay/mode-picker";
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
      <EssayModePicker
        themeId={theme.id}
        title={theme.title}
        kind={theme.kind ?? ""}
      />
    </AppShell>
  );
}

