import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  BookOpen,
  Clock,
  GraduationCap,
  RefreshCw,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Markdown } from "@/components/content/markdown";
import { DemoFrame } from "@/components/demos/demo-frame";
import { getSupabaseServerClient } from "@/lib/db/server";
import { eloToPercent } from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function TopicPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: topic }] = await Promise.all([
    supabase.from("profiles").select("apelido, onboarding_completed").eq("id", user.id).single(),
    supabase
      .from("topics")
      .select("id, slug, name, description, level, enem_weight, demo_id, matrix_codes, area_id")
      .eq("slug", slug)
      .not("parent_id", "is", null)
      .single(),
  ]);

  if (!topic) notFound();
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const [{ data: lesson }, { data: mastery }, { data: area }] = await Promise.all([
    supabase.from("lessons").select("explanation_md, estimated_minutes, videos").eq("topic_id", topic.id).single(),
    supabase.from("topic_mastery").select("elo, confidence, attempts_count").eq("user_id", user.id).eq("topic_id", topic.id).single(),
    supabase.from("areas").select("name").eq("id", topic.area_id).single(),
  ]);

  const percent = mastery ? eloToPercent(mastery.elo) : null;
  const videos = (lesson?.videos as Array<{ id: string; title: string; channel: string }>) ?? [];

  return (
    <AppShell apelido={profile.apelido}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <nav className="mb-4 text-sm text-muted-foreground" aria-label="Trilha">
          <Link href="/estudo" className="hover:text-foreground">
            Estudar
          </Link>
          <span className="mx-1.5" aria-hidden="true">/</span>
          <span>{area?.name}</span>
          <span className="mx-1.5" aria-hidden="true">/</span>
          <span className="text-foreground">{topic.name}</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{topic.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-border bg-card px-2.5 py-0.5">
              {topic.level === 1 ? "básico" : topic.level === 2 ? "intermediário" : "avançado"}
            </span>
            <span className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5" aria-hidden="true" />
              peso {Number(topic.enem_weight).toString().replace(".", ",")} no ENEM
            </span>
            {percent !== null ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-primary">
                domínio {Math.round(percent)}%
              </span>
            ) : null}
          </div>
        </header>

        {/* Lesson cycle: demo → explanation → video → practice → test */}
        <section className="mb-8 space-y-6">
          {topic.demo_id ? (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                <SparkleIcon /> 1 · Veja o conceito em movimento
              </h2>
              <DemoFrame demoId={topic.demo_id} />
            </div>
          ) : null}

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              {topic.demo_id ? "2 · " : ""}Explicação
            </h2>
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              {lesson?.explanation_md ? (
                <>
                  <Markdown content={lesson.explanation_md} />
                  {lesson.estimated_minutes ? (
                    <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {lesson.estimated_minutes} min de leitura
                    </p>
                  ) : null}
                </>
              ) : (
                <Markdown content={topic.description ?? ""} />
              )}
            </div>
          </div>

          {videos.length > 0 ? (
            <div>
              <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                3 · Vídeo recomendado
              </h2>
              <div className="space-y-3">
                {videos.map((video) => (
                  <figure key={video.id} className="overflow-hidden rounded-2xl border border-border">
                    <div className="relative aspect-video bg-black">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                        title={video.title}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                    <figcaption className="bg-card px-4 py-2.5 text-sm text-muted-foreground">
                      {video.title} · {video.channel}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* Practice + test */}
        <section className="grid gap-4 sm:grid-cols-2" aria-label="Praticar">
          <Link
            href={`/estudo/pratica?topico=${topic.slug}`}
            className="group flex flex-col gap-2 rounded-2xl bg-brand-gradient p-5 font-medium text-white transition-transform hover:scale-[1.01]"
          >
            <GraduationCap className="h-6 w-6" aria-hidden="true" />
            <span className="text-lg">Prática guiada</span>
            <span className="text-sm text-white/85">
              Questões adaptativas deste tópico, com dicas em camadas.
            </span>
            <span className="mt-2 flex items-center gap-1 text-sm">
              Começar
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>

          <Link
            href={`/estudo/pratica?topico=${topic.slug}&modo=teste`}
            className="group flex flex-col gap-2 rounded-2xl border-2 border-border bg-card p-5 font-medium transition-colors hover:border-primary/60"
          >
            <RefreshCw className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-lg">Teste do tópico</span>
            <span className="text-sm text-muted-foreground">
              5 questões sem dicas — meta de 80% para concluir a aula.
            </span>
            <span className="mt-2 flex items-center gap-1 text-sm text-primary">
              Fazer o teste
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        </section>

        {mastery && mastery.attempts_count > 0 ? (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mastery.attempts_count} tentativa(s) neste tópico · confiança do
            sistema {Math.round(mastery.confidence * 100)}% · a revisão é
            agendada automaticamente pelo algoritmo de repetição espaçada.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}

function SparkleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2L12 3z" />
    </svg>
  );
}
