import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarDays,
  Flame,
  RefreshCw,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { GoalRing } from "@/components/dashboard/goal-ring";
import { StreakWeek } from "@/components/dashboard/streak-week";
import { ConsistencyMap } from "@/components/dashboard/consistency-map";
import { MasteryBars } from "@/components/dashboard/mastery-bars";
import { AccuracyLine } from "@/components/dashboard/accuracy-line";
import { AnimatedNumber } from "@/components/dashboard/animated-number";
import { Button } from "@/components/ui/button";
import { getSupabaseServerClient } from "@/lib/db/server";
import { getDashboardData } from "@/lib/dashboard/queries";
import { leagueFromLevel } from "@/lib/gamification/xp";

export const metadata: Metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

function dateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default async function PainelPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = await getDashboardData(user.id);
  if (!data) redirect("/login");
  if (!data.profile.onboarding_completed) redirect("/onboarding");

  const { profile, streak, goal } = data;

  // ---- week view for the streak card (Sunday..Saturday of current week) ----
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(sunday);
    day.setDate(sunday.getDate() + i);
    const key = dateKey(day);
    const studied = (data.last84DaysMap.get(key) ?? 0) > 0;
    const isToday = key === dateKey(now);
    const isFuture = day.getTime() > now.getTime();
    return isFuture ? null : { studied, isToday };
  });

  // ---- 12-week consistency grid (columns = weeks, Sunday-first rows) ----
  const weeks: number[][] = [];
  const endOfThisWeek = new Date(sunday);
  endOfThisWeek.setDate(sunday.getDate() + 6);
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(endOfThisWeek);
    weekStart.setDate(endOfThisWeek.getDate() - w * 7 - 6);
    const column = Array.from({ length: 7 }, (_, day) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + day);
      if (d.getTime() > now.getTime()) return 0;
      const count = data.last84DaysMap.get(dateKey(d)) ?? 0;
      if (count === 0) return 0;
      if (count <= 3) return 1;
      if (count <= 8) return 2;
      if (count <= 15) return 3;
      return 4;
    });
    weeks.push(column);
  }

  // ---- accuracy line data ----
  const accuracyData = data.last14Days.map((d) => ({
    day: d.date.slice(5).split("-").reverse().join("/"),
    accuracy: d.questions > 0 ? Math.round((d.correct / d.questions) * 100) : null,
  }));

  const daysLeft = profile.target_exam_date
    ? Math.max(
        0,
        Math.ceil(
          (new Date(profile.target_exam_date + "T00:00:00").getTime() - Date.now()) / 86400000,
        ),
      )
    : null;

  const goalProgress =
    goal.targetQuestions > 0 ? goal.doneQuestions / goal.targetQuestions : 0;

  const isNewUser = data.last14Days.every((d) => d.questions === 0);

  return (
    <AppShell apelido={profile.apelido}>
      <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6">
        {!profile.level_test_completed ? (
          <Link
            href="/teste-de-nivel"
            className="group flex items-center justify-between gap-3 rounded-2xl bg-brand-gradient p-4 text-white transition-transform hover:scale-[1.01]"
          >
            <span className="flex items-center gap-3">
              <Rocket className="h-6 w-6 shrink-0" aria-hidden="true" />
              <span>
                <span className="block font-semibold">Faça o teste de nível (~16 questões)</span>
                <span className="block text-sm text-white/85">
                  Mapeia o que você já sabe para o plano começar no lugar certo.
                </span>
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        ) : null}

        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Olá, {profile.apelido}
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile.rank_title} · Nível {profile.level} ·{" "}
              <Zap className="inline h-3.5 w-3.5 text-accent-1-ink" aria-hidden="true" />{" "}
              <AnimatedNumber value={profile.xp} className="tabular-nums" /> XP
              <span className="text-muted-foreground/70">
                {" "}({data.xpToday} hoje)
              </span>
            </p>
          </div>
          {daysLeft !== null ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm">
              <CalendarDays className="h-4 w-4 text-accent-2-ink" aria-hidden="true" />
              <span>
                <strong className="tabular-nums">{daysLeft}</strong> dias para a prova
              </span>
            </div>
          ) : null}
        </header>

        {/* Row 1: goal + streak + continue */}
        <section className="grid gap-4 sm:grid-cols-3" aria-label="Resumo do dia">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" aria-hidden="true" /> Meta de hoje
            </h2>
            <div className="flex justify-center">
              <GoalRing
                progress={goalProgress}
                done={goal.doneQuestions}
                target={goal.targetQuestions}
                label="questões"
                sublabel={`Plano: ${Math.round(goal.targetMinutes / 6) / 10}h de estudo`}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Flame className="h-4 w-4" aria-hidden="true" /> Sequência
            </h2>
            <div className="flex flex-1 items-center justify-center">
              <StreakWeek days={weekDays} current={streak.current} />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Recorde: {streak.longest} dias
              {streak.freezes_available > 0
                ? ` · ${streak.freezes_available} congelamento disponível`
                : ""}
            </p>
          </div>

          <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Missão do dia
            </h2>
            <div className="flex flex-1 flex-col justify-center gap-3">
              {data.reviewsDue > 0 ? (
                <Link
                  href="/estudo/revisao"
                  className="group flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:border-primary/60"
                >
                  <span className="flex items-center gap-3 text-sm">
                    <RefreshCw className="h-5 w-5 text-accent-2-ink" aria-hidden="true" />
                    {data.reviewsDue} revisões vencendo
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              ) : null}
              <Link
                href="/estudo"
                className="group flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:border-primary/60"
              >
                <span className="flex items-center gap-3 text-sm">
                  <BookOpen className="h-5 w-5 text-accent-1-ink" aria-hidden="true" />
                  {isNewUser ? "Começar a estudar" : "Continuar estudando"}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/redacao"
                className="group flex items-center justify-between rounded-xl border border-border p-3 transition-colors hover:border-primary/60"
              >
                <span className="flex items-center gap-3 text-sm">
                  <Sparkles className="h-5 w-5 text-accent-1-ink" aria-hidden="true" />
                  Redação da semana
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* Row 2: consistency map */}
        <section className="rounded-2xl border border-border bg-card p-5" aria-label="Mapa de constância">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarDays className="h-4 w-4" aria-hidden="true" /> Mapa de constância
              <span className="text-muted-foreground/60">· 12 semanas</span>
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span>menos</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className={`h-3 w-3 rounded ${["bg-card border border-border", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-brand-gradient"][l]}`} />
              ))}
              <span>mais</span>
            </div>
          </div>
          {isNewUser ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Seu mapa ainda está limpo — cada dia estudado acende uma luz aqui.
            </p>
          ) : (
            <ConsistencyMap weeks={weeks} />
          )}
        </section>

        {/* Row 3: mastery + accuracy */}
        <section className="grid gap-4 md:grid-cols-2" aria-label="Domínio e evolução">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Brain className="h-4 w-4" aria-hidden="true" /> Domínio por área
            </h2>
            {data.masteryByArea.length > 0 ? (
              <MasteryBars bars={data.masteryByArea} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Faça o teste de nível ou responda questões para mapear seu domínio.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" aria-hidden="true" /> Evolução de acertos
              <span className="text-muted-foreground/60">· 14 dias</span>
            </h2>
            <AccuracyLine data={accuracyData} />
          </div>
        </section>

        {/* Row 4: weaknesses + ranking */}
        <section className="grid gap-4 md:grid-cols-2" aria-label="Pontos fracos e ranking">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" aria-hidden="true" /> Pontos fracos
            </h2>
            {data.weaknesses.length > 0 ? (
              <ul className="space-y-2">
                {data.weaknesses.map(({ topic, mastery }) => (
                  <li key={topic.id}>
                    <Link
                      href={`/estudo/topico/${topic.slug}`}
                      className="group flex items-center justify-between rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-primary/60"
                    >
                      <span className="text-sm">{topic.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                          {Math.round(((mastery.elo - 400) / 1400) * 100)}%
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sem pontos fracos mapeados ainda — pratique para o StudyMoon aprender com você.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Trophy className="h-4 w-4" aria-hidden="true" /> Ranking da semana
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                liga {leagueFromLevel(profile.level)}
              </span>
            </h2>
            {data.ranking.length > 0 ? (
              <ol className="space-y-1.5">
                {data.ranking.slice(0, 5).map((row, i) => (
                  <li
                    key={row.user_id}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                      row.user_id === user.id ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs text-muted-foreground tabular-nums">
                        {i + 1}º
                      </span>
                      {row.user_id === user.id ? "Você" : `Lunar #${i + 1}`}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{row.xp_week} XP</span>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-center text-sm text-muted-foreground">
                  A liga desta semana começa agora — cada XP conta.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/estudo">Ganhar XP</Link>
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
