import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { EssayEditor } from "@/components/essay/essay-editor";
import { getSupabaseServerClient } from "@/lib/db/server";
import { createEssay } from "@/lib/essay/actions";

export const metadata: Metadata = { title: "Nova redação" };
export const dynamic = "force-dynamic";

/** Creates the essay row and renders the editor (doc section 6.10). */
export default async function NovaRedacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ tema?: string; modo?: string }>;
}) {
  const { tema, modo } = await searchParams;
  if (!tema) redirect("/redacao");

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: theme } = await supabase
    .from("essay_themes")
    .select("id, title, texts_motivadores")
    .eq("id", tema)
    .eq("status", "validated")
    .single();
  if (!theme) redirect("/redacao");

  const created = await createEssay({
    themeId: theme.id,
    mode: modo === "prova" ? "exam" : "training",
  });
  if (!created.ok) redirect("/redacao");

  return (
    <AppShell apelido="">
      <EssayEditor
        essayId={created.essayId}
        themeTitle={theme.title}
        motivatingTexts={
          (theme.texts_motivadores as Array<{ source: string; text: string }>) ?? []
        }
        mode={modo === "prova" ? "exam" : "training"}
      />
    </AppShell>
  );
}
