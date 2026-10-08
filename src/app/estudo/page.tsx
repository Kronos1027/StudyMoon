import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  BookOpen,
  ArrowRight,
  FlaskConical,
  Globe2,
  PenLine,
  Sigma,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { getSupabaseServerClient } from "@/lib/db/server";
import { eloToPercent } from "@/lib/dashboard/queries";
import type { Area, TopicMastery } from "@/lib/db/types";

export const metadata: Metadata = { title: "Estudar" };
export const dynamic = "force-dynamic";

const AREA_ICONS: Record<string, typeof Sigma> = {
  mt: Sigma,
  lc: BookOpen,
  ch: Globe2,
  cn: FlaskConical,
  redacao: PenLine,
};

export default async function EstudoPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: areas }, { data: disciplines }, { data: topics }, { data: mastery }] =
    await Promise.all([
      supabase.from("profiles").select("apelido, onboarding_completed").eq("id", user.id).single(),
      supabase.from("areas").select("*").order("sort_order"),
      supabase.from("topics").select("id, slug, name, area_id").is("parent_id", null),
      supabase.from("topics").select("id, slug, name, description, area_id, parent_id, level, enem_weight").not("parent_id", "is", null).order("sort_order"),
      supabase.from("topic_mastery").select("topic_id, elo").eq("user_id", user.id),
    ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const masteryMap = new Map((mastery ?? []).map((m) => [m.topic_id, m as TopicMastery]));

  return (
    <AppShell apelido={profile.apelido}>
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Estudar</h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma área para ver os tópicos — o marcador mostra seu domínio.
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/estudo/pratica"
            className="group flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 font-medium text-white transition-transform hover:scale-[1.02]"
          >
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            Prática adaptativa
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
          <Link
            href="/estudo/revisao"
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-medium transition-colors hover:border-primary/60"
          >
            Revisão do dia
          </Link>
        </div>

        <div className="space-y-8">
          {(areas ?? []).map((area: Area) => {
            const Icon = AREA_ICONS[area.slug] ?? BookOpen;
            const areaTopics = (topics ?? []).filter((t) => t.area_id === area.id);
            const areaDisciplines = (disciplines ?? []).filter(
              (d) => d.area_id === area.id,
            );

            return (
              <section key={area.id} aria-labelledby={`area-${area.slug}`}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h2 id={`area-${area.slug}`} className="text-lg font-semibold">
                    {area.name}
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {areaTopics.length} tópicos
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {areaDisciplines.map((discipline) => {
                    const disciplineTopics = areaTopics.filter(
                      (t) => t.parent_id === discipline.id,
                    );
                    if (disciplineTopics.length === 0) return null;
                    return (
                      <div
                        key={discipline.id}
                        className="rounded-2xl border border-border bg-card p-4"
                      >
                        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                          {discipline.name}
                        </h3>
                        <ul className="space-y-1">
                          {disciplineTopics.map((topic) => {
                            const m = masteryMap.get(topic.id);
                            const percent = m ? eloToPercent(m.elo) : null;
                            return (
                              <li key={topic.id}>
                                <Link
                                  href={`/estudo/topico/${topic.slug}`}
                                  className="group flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-accent"
                                >
                                  <span className="min-w-0 flex-1 truncate text-sm">
                                    {topic.name}
                                  </span>
                                  {percent !== null ? (
                                    <span className="ml-2 shrink-0 text-xs tabular-nums text-muted-foreground">
                                      {Math.round(percent)}%
                                    </span>
                                  ) : (
                                    <span className="ml-2 shrink-0 text-xs text-muted-foreground/50">
                                      novo
                                    </span>
                                  )}
                                  <ArrowRight
                                    className="ml-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
                                    aria-hidden="true"
                                  />
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
