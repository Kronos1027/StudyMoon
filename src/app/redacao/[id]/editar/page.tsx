import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { EssayEditor } from "@/components/essay/essay-editor";
import { getSupabaseServerClient } from "@/lib/db/server";

export const metadata: Metadata = { title: "Continuar redação" };
export const dynamic = "force-dynamic";

/** Loads only the signed-in student's existing editable draft. */
export default async function EditEssayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: essay }, { data: profile }] = await Promise.all([
    supabase
      .from("essays")
      .select("id, user_id, theme_id, prompt_title, content_md, status, mode")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("apelido").eq("id", user.id).maybeSingle(),
  ]);

  if (!essay) notFound();
  if (essay.status !== "draft") redirect(`/redacao/${essay.id}`);

  const { data: theme } = essay.theme_id
    ? await supabase
        .from("essay_themes")
        .select("texts_motivadores")
        .eq("id", essay.theme_id)
        .maybeSingle()
    : { data: null };

  return (
    <AppShell apelido={profile?.apelido ?? ""}>
      <EssayEditor
        essayId={essay.id}
        themeTitle={essay.prompt_title}
        motivatingTexts={
          (theme?.texts_motivadores as Array<{ source: string; text: string }>) ?? []
        }
        mode={essay.mode === "exam" ? "exam" : "training"}
        initialContent={essay.content_md ?? ""}
      />
    </AppShell>
  );
}
