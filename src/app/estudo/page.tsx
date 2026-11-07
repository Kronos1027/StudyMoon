import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, BookOpen, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { StudyCatalog } from "@/components/study/study-catalog";
import { getSupabaseServerClient } from "@/lib/db/server";
import { eloToPercent } from "@/lib/dashboard/queries";

export const metadata: Metadata = { title: "Estudar" };
export const dynamic = "force-dynamic";

export default async function EstudoPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: areas },
    { data: disciplines },
    { data: topics },
    { data: mastery },
  ] = await Promise.all([
    supabase.from("profiles").select("apelido, onboarding_completed").eq("id", user.id).single(),
    supabase.from("areas").select("id, slug, name").order("sort_order"),
    supabase.from("topics").select("id, name, area_id").is("parent_id", null),
    supabase
      .from("topics")
      .select("id, slug, name, area_id, parent_id")
      .not("parent_id", "is", null)
      .order("sort_order"),
    supabase.from("topic_mastery").select("topic_id, elo").eq("user_id", user.id),
  ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const masteryMap = new Map((mastery ?? []).map((row) => [row.topic_id, row.elo]));

  return (
    <AppShell apelido={profile.apelido}>
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Estudar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha seu próximo passo e acompanhe a evolução em cada matéria.
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/estudo/pratica"
            className="group flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-brand-gradient px-5 py-4 font-medium text-white shadow-sm transition-transform hover:scale-[1.01]"
          >
            <span className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />
              Prática adaptativa
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link
            href="/estudo/revisao"
            className="group flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-5 py-4 font-medium transition-colors hover:border-primary/60"
          >
            <span className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 shrink-0 text-accent-2-ink" aria-hidden="true" />
              Revisão do dia
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>

        <StudyCatalog
          areas={(areas ?? []).map((area) => ({ id: area.id, slug: area.slug, name: area.name }))}
          disciplines={(disciplines ?? []).map((discipline) => ({
            id: discipline.id,
            areaId: discipline.area_id,
            name: discipline.name,
          }))}
          topics={(topics ?? []).map((topic) => ({
            id: topic.id,
            areaId: topic.area_id,
            disciplineId: topic.parent_id!,
            slug: topic.slug,
            name: topic.name,
            mastery: masteryMap.has(topic.id) ? eloToPercent(masteryMap.get(topic.id)!) : null,
          }))}
        />
      </div>
    </AppShell>
  );
}
