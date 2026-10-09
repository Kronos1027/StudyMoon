import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Award, Bell, Download, ShieldAlert, User } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { ProfileSettings, DeleteAccount } from "@/components/profile/profile-settings";
import { getSupabaseServerClient } from "@/lib/db/server";

export const metadata: Metadata = { title: "Perfil" };
export const dynamic = "force-dynamic";

/** Profile: identity, notification settings, badges, LGPD export/ delete. */
export default async function PerfilPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: badges }, { data: streak }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("user_badges")
      .select("earned_at, badges (slug, name, description, icon)")
      .eq("user_id", user.id),
    supabase.from("streaks").select("*").eq("user_id", user.id).single(),
  ]);

  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <AppShell apelido={profile.apelido}>
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <header className="mb-6 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-xl font-bold text-white">
            {profile.apelido.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile.apelido}
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile.rank_title} · Nível {profile.level} ·{" "}
              {profile.xp} XP
            </p>
          </div>
        </header>

        <div className="space-y-5">
          {/* Settings (identity + study prefs + notifications) */}
          <section className="rounded-2xl border border-border bg-card p-5" aria-label="Configurações">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" aria-hidden="true" /> Configurações
            </h2>
            <ProfileSettings
              initial={{
                apelido: profile.apelido,
                birthDate: profile.birth_date,
                targetExamDate: profile.target_exam_date,
                dailyHours: Number(profile.daily_hours),
                preferredTime: profile.preferred_study_time.slice(0, 5),
                notifyPush: profile.notify_push,
                weeklySummary: profile.weekly_summary,
                overloadGuard: profile.overload_guard,
              }}
              streakLongest={streak?.longest ?? 0}
            />
          </section>

          {/* Badges */}
          <section className="rounded-2xl border border-border bg-card p-5" aria-label="Conquistas">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Award className="h-4 w-4" aria-hidden="true" /> Conquistas
            </h2>
            {badges && badges.length > 0 ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                {badges.map((b) => {
                  const badgeList = b.badges as unknown as Array<{
                    slug: string;
                    name: string;
                    description: string;
                  }>;
                  const badge = Array.isArray(badgeList) ? badgeList[0] : null;
                  if (!badge) return null;
                  return (
                    <li
                      key={badge.slug}
                      className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-transparent p-3"
                    >
                      <p className="text-sm font-semibold">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {badge.description}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma medalha ainda — a primeira vem com 7 dias de sequência.
              </p>
            )}
          </section>

          {/* LGPD: data rights */}
          <section className="rounded-2xl border border-border bg-card p-5" aria-label="Seus dados (LGPD)">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Download className="h-4 w-4" aria-hidden="true" /> Seus dados
              (LGPD)
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              O StudyMoon coleta apenas e-mail, apelido e dados de estudo. Você
              pode exportar tudo ou apagar sua conta a qualquer momento — sem
              burocracia.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/api/perfil/exportar"
                download="studymoon-meus-dados.json"
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/60"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Exportar meus dados
              </a>
            </div>

            <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                Apagar minha conta
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Apaga permanentemente seu perfil, tentativas, redações,
                notificações e progresso. Não há como desfazer.
              </p>
              <DeleteAccount />
            </div>
          </section>

          {/* Notifications status */}
          <section className="rounded-2xl border border-border bg-card p-5" aria-label="Notificações">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Bell className="h-4 w-4" aria-hidden="true" /> Como os lembretes chegam
            </h2>
            <p className="text-sm text-muted-foreground">
              Os avisos chegam por notificação do navegador/pwa — no máximo 2
              por dia, nunca entre 22h e 7h, sempre desligáveis acima. No
              iPhone, é preciso instalar o site na tela de início (o app mostra
              o passo a passo quando você ativa os lembretes).
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
