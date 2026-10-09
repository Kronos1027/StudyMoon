import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardList,
  PenLine,
  RefreshCw,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { DayPlan, PlanBlock } from "@/lib/planner";

/**
 * "Agenda de hoje" card (doc section 7.4): renders the planner output for
 * today with deep links. Server component — no client state needed.
 */

const MAX_VISIBLE_BLOCKS = 6;

interface BlockMeta {
  icon: LucideIcon;
  color: string;
  href: (topicSlug: string | null) => string;
}

const BLOCK_META: Record<PlanBlock["kind"], BlockMeta> = {
  review: {
    icon: RefreshCw,
    color: "text-accent-2-ink",
    href: () => "/estudo/revisao",
  },
  new_lesson: {
    icon: BookOpen,
    color: "text-accent-1-ink",
    href: (slug) => (slug ? `/estudo/topico/${slug}` : "/estudo"),
  },
  practice: {
    icon: Zap,
    color: "text-accent-1-ink",
    href: (slug) => (slug ? `/estudo/pratica?topico=${slug}` : "/estudo/pratica"),
  },
  mock_exam: {
    icon: ClipboardList,
    color: "text-accent-2-ink",
    href: () => "/simulado",
  },
  essay: {
    icon: PenLine,
    color: "text-accent-1-ink",
    href: () => "/redacao/nova",
  },
};

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export interface TodayPlanProps {
  plan: DayPlan | null;
  slugById: Record<string, string>;
  hasExamDate: boolean;
  /** Days to the exam (null when unset) — used to pick the empty state. */
  daysLeft: number | null;
}

export function TodayPlan({ plan, slugById, hasExamDate, daysLeft }: TodayPlanProps) {
  const blocks = plan?.blocks ?? [];
  const visible = blocks.slice(0, MAX_VISIBLE_BLOCKS);
  const hidden = blocks.length - visible.length;

  return (
    <section className="rounded-2xl border border-border bg-card p-5" aria-label="Agenda de hoje">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="h-4 w-4" aria-hidden="true" /> Agenda de hoje
        </h2>
        {blocks.length > 0 ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatMinutes(plan!.totalMinutes)} planejados
          </span>
        ) : null}
      </div>

      {!hasExamDate ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="max-w-md text-sm text-muted-foreground">
            Defina a data da prova e suas horas de estudo para o StudyMoon montar
            sua agenda diária — revisões primeiro, aulas novas no ritmo certo.
          </p>
          <Link
            href="/perfil"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm transition-colors hover:border-primary/60"
          >
            Definir data da prova
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : blocks.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {daysLeft !== null && daysLeft <= 0
            ? "A data da prova chegou — boa prova! Para um novo ciclo, atualize a data no perfil."
            : "Agenda vazia para hoje. Ajuste suas horas de estudo no perfil para receber blocos."}
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {visible.map((block, i) => {
              const meta = BLOCK_META[block.kind];
              const Icon = meta.icon;
              const slug = block.topicId ? (slugById[block.topicId] ?? null) : null;
              return (
                <li key={`${block.kind}-${i}`}>
                  <Link
                    href={meta.href(slug)}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-primary/60"
                  >
                    <span className="flex min-w-0 items-center gap-3 text-sm">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${meta.color}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{block.label}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground tabular-nums">
                      {formatMinutes(block.minutes)}
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {hidden > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              + {hidden} {hidden === 1 ? "bloco" : "blocos"} — se preferir um dia
              mais leve, reduza as horas no perfil.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
