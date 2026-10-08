import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { LevelTestRunner } from "@/components/level-test/level-test-runner";
import { getSupabaseServerClient } from "@/lib/db/server";

export const metadata: Metadata = { title: "Teste de nível" };
export const dynamic = "force-dynamic";

/** Adaptive level test (doc section 6.4): ~16 questions, 4 per area. */
export default async function TesteDeNivelPage() {
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

  return (
    <AppShell apelido={profile.apelido}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Teste de nível
          </h1>
          <p className="text-sm text-muted-foreground">
            Cerca de 16 questões, começando na dificuldade média: acertar
            sobe o nível, errar desce. O objetivo não é nota — é mapear o que
            você já domina para o plano começar no lugar certo.
          </p>
        </header>
        <LevelTestRunner />
      </div>
    </AppShell>
  );
}
