import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Crown, Medal, Trophy } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { getSupabaseServerClient } from "@/lib/db/server";
import { leagueFromLevel } from "@/lib/gamification/xp";

export const metadata: Metadata = { title: "Ranking" };
export const dynamic = "force-dynamic";

/** Weekly league ranking (doc section 6.11). */
export default async function RankingPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: myMastery }, { data: leaderboard }] =
    await Promise.all([
      supabase.from("profiles").select("apelido, onboarding_completed, level, xp").eq("id", user.id).single(),
      supabase.from("topic_mastery").select("elo").eq("user_id", user.id),
      supabase
        .from("weekly_leaderboard")
        .select("user_id, xp_week, league, rank")
        .order("xp_week", { ascending: false })
        .limit(50),
    ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  const myLeague = leagueFromLevel(profile.level);
  const leagueRows = (leaderboard ?? []).filter((r) => r.league === myLeague);
  const myElo = myMastery?.reduce((s, m) => s + m.elo, 0) ?? 0;
  const myAvg = myMastery && myMastery.length > 0 ? myElo / myMastery.length : null;

  const podium = leagueRows.slice(0, 3);
  const rest = leagueRows.slice(3, 10);
  const podiumIcons = [Crown, Medal, Medal];

  return (
    <AppShell apelido={profile.apelido}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Ranking semanal
          </h1>
          <p className="text-sm text-muted-foreground">
            Ligas por faixa de nível — você compete apenas com quem está na
            mesma fase da jornada. Sua liga:{" "}
            <span className="font-medium text-primary capitalize">{myLeague}</span>
          </p>
        </header>

        {leagueRows.length > 0 ? (
          <>
            <div className="mb-6 grid grid-cols-3 gap-3" aria-label="Pódio">
              {podium.map((row, i) => {
                const Icon = podiumIcons[i];
                const isMe = row.user_id === user.id;
                return (
                  <div
                    key={row.user_id}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 ${
                      isMe ? "border-primary bg-primary/10" : "border-border bg-card"
                    } ${i === 0 ? "sm:-mt-3" : ""}`}
                  >
                    <Icon
                      className={`h-7 w-7 ${i === 0 ? "text-accent-2-ink" : "text-muted-foreground"}`}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">
                      {isMe ? "Você" : `Lunar ${i + 1}`}
                    </span>
                    <span className="tabular-nums text-sm text-muted-foreground">
                      {row.xp_week} XP
                    </span>
                  </div>
                );
              })}
            </div>

            {rest.length > 0 ? (
              <ol className="space-y-1.5">
                {rest.map((row, i) => (
                  <li
                    key={row.user_id}
                    className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm ${
                      row.user_id === user.id ? "bg-primary/10" : "bg-card border border-border"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs text-muted-foreground tabular-nums">
                        {i + 4}º
                      </span>
                      {row.user_id === user.id ? "Você" : `Lunar ${i + 4}`}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {row.xp_week} XP
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <div>
              <h2 className="font-semibold">A liga {myLeague} desta semana começou</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                O placar é calculado toda noite com o XP da semana. Estude hoje
                e apareça aqui — prêmios: troféu, moldura e título.
              </p>
            </div>
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-border bg-card p-5" aria-label="Sua posição">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Seu resumo
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{profile.xp}</p>
              <p className="text-xs text-muted-foreground">XP total</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">{profile.level}</p>
              <p className="text-xs text-muted-foreground">Nível</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums">
                {myAvg !== null ? Math.round(((myAvg - 400) / 1400) * 100) + "%" : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Domínio médio</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
