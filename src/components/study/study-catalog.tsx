"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  FlaskConical,
  Globe2,
  PenLine,
  Search,
  Sigma,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

export interface StudyArea {
  id: string;
  slug: string;
  name: string;
}

export interface StudyDiscipline {
  id: string;
  areaId: string;
  name: string;
}

export interface StudyTopic {
  id: string;
  areaId: string;
  disciplineId: string;
  slug: string;
  name: string;
  mastery: number | null;
}

type ProgressFilter = "all" | "new" | "learning" | "mastered";
const PROGRESS_FILTERS: { id: ProgressFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "new", label: "Não iniciados" },
  { id: "learning", label: "Em evolução" },
  { id: "mastered", label: "Dominados" },
];

const AREA_ICONS: Record<string, typeof Sigma> = {
  mt: Sigma,
  lc: BookOpen,
  ch: Globe2,
  cn: FlaskConical,
  redacao: PenLine,
};

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

/** Client-only filtering: no extra database reads, and no changes to student data. */
export function StudyCatalog({
  areas,
  disciplines,
  topics,
}: {
  areas: StudyArea[];
  disciplines: StudyDiscipline[];
  topics: StudyTopic[];
}) {
  const [query, setQuery] = useState("");
  const [areaId, setAreaId] = useState<string>("all");
  const [progress, setProgress] = useState<ProgressFilter>("all");

  const known = topics.filter((topic) => topic.mastery !== null).length;
  const mastered = topics.filter((topic) => (topic.mastery ?? -1) >= 70).length;
  const completion = topics.length ? Math.round((known / topics.length) * 100) : 0;

  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    const areaNames = new Map(areas.map((area) => [area.id, area.name]));
    const disciplineNames = new Map(disciplines.map((discipline) => [discipline.id, discipline.name]));

    return topics.filter((topic) => {
      if (areaId !== "all" && topic.areaId !== areaId) return false;
      if (progress === "new" && topic.mastery !== null) return false;
      if (progress === "learning" && (topic.mastery === null || topic.mastery >= 70)) return false;
      if (progress === "mastered" && (topic.mastery === null || topic.mastery < 70)) return false;
      if (!needle) return true;

      return normalize([
        topic.name,
        disciplineNames.get(topic.disciplineId) ?? "",
        areaNames.get(topic.areaId) ?? "",
      ].join(" ")).includes(needle);
    });
  }, [areaId, areas, disciplines, progress, query, topics]);

  function clearFilters() {
    setQuery("");
    setAreaId("all");
    setProgress("all");
  }

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-5 sm:p-7" aria-label="Seu mapa de estudos">
        <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Seu universo de conhecimento
            </span>
            <h2 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
              Cada tópico é uma conquista.
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Busque qualquer assunto, encontre o que precisa reforçar e avance no seu ritmo.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs sm:text-sm">
              <span className="rounded-full border border-border bg-background/70 px-3 py-1.5">{topics.length} tópicos</span>
              <span className="rounded-full border border-border bg-background/70 px-3 py-1.5">{known} iniciados</span>
              <span className="rounded-full border border-border bg-background/70 px-3 py-1.5">{mastered} dominados</span>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-background/70 p-4 sm:flex-col sm:gap-1 sm:border-0 sm:bg-transparent" aria-label={`Tópicos iniciados: ${completion}%`}>
            <span className="text-4xl font-bold tabular-nums text-primary sm:text-5xl">{completion}%</span>
            <span className="text-xs text-muted-foreground">do catálogo explorado</span>
          </div>
        </div>
        <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-primary/10" role="progressbar" aria-label="Tópicos iniciados" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-brand-gradient transition-[width] duration-300" style={{ width: `${completion}%` }} />
        </div>
      </section>

      <section aria-label="Encontre uma matéria" className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
          Encontre seu próximo assunto
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="study-search" className="sr-only">Buscar assunto, disciplina ou área</label>
          <input
            id="study-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: frações, biologia, interpretação..."
            className="h-12 w-full rounded-xl border border-input bg-background pl-10 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Limpar busca" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scroll-moon" aria-label="Filtrar área">
          <button type="button" aria-pressed={areaId === "all"} onClick={() => setAreaId("all")} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${areaId === "all" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>Todas as áreas</button>
          {areas.map((area) => (
            <button key={area.id} type="button" aria-pressed={areaId === area.id} onClick={() => setAreaId(area.id)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-medium transition-colors ${areaId === area.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
              {area.name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filtrar progresso">
          {PROGRESS_FILTERS.map((item) => (
            <button key={item.id} type="button" aria-pressed={progress === item.id} onClick={() => setProgress(item.id)} className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${progress === item.id ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "tópico encontrado" : "tópicos encontrados"} de {topics.length}
        </p>
      </section>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-5 py-12 text-center">
          <Compass className="h-10 w-10 text-primary" aria-hidden="true" />
          <h2 className="font-semibold">Nenhum tópico encontrado</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Tente outra palavra ou remova os filtros para explorar todas as matérias.</p>
          <button type="button" onClick={clearFilters} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">Limpar filtros</button>
        </div>
      ) : (
        <div className="space-y-8">
          {areas.map((area) => {
            const areaTopics = filtered.filter((topic) => topic.areaId === area.id);
            if (areaTopics.length === 0) return null;
            const Icon = AREA_ICONS[area.slug] ?? BookOpen;
            return (
              <section key={area.id} aria-labelledby={`area-${area.slug}`}>
                <header className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <h2 id={`area-${area.slug}`} className="text-lg font-semibold">{area.name}</h2>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs tabular-nums text-muted-foreground">{areaTopics.length} tópicos</span>
                </header>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {disciplines.filter((discipline) => discipline.areaId === area.id).map((discipline) => {
                    const entries = areaTopics.filter((topic) => topic.disciplineId === discipline.id);
                    if (!entries.length) return null;
                    const completed = entries.filter((topic) => (topic.mastery ?? -1) >= 70).length;
                    return (
                      <div key={discipline.id} className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <h3 className="font-semibold leading-snug">{discipline.name}</h3>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-[11px] tabular-nums text-primary">{completed}/{entries.length}</span>
                        </div>
                        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`Tópicos dominados em ${discipline.name}`} aria-valuenow={completed} aria-valuemax={entries.length} aria-valuemin={0}>
                          <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${(completed / entries.length) * 100}%` }} />
                        </div>
                        <ul className="space-y-1">
                          {entries.map((topic) => (
                            <li key={topic.id}>
                              <Link href={`/estudo/topico/${topic.slug}`} className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-accent focus-visible:bg-accent">
                                <span className="min-w-0 flex-1 break-words">{topic.name}</span>
                                {topic.mastery === null ? (
                                  <span className="shrink-0 text-[11px] text-muted-foreground">novo</span>
                                ) : topic.mastery >= 70 ? (
                                  <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-success"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{Math.round(topic.mastery)}%</span>
                                ) : (
                                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{Math.round(topic.mastery)}%</span>
                                )}
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
