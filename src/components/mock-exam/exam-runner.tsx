"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Loader2,
  Timer,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/content/markdown";
import { finishMockExam, type ExamQuestion } from "@/lib/mock-exam/actions";
import { cn } from "@/lib/utils";

interface ExamRunnerProps {
  examId: string;
  questions: ExamQuestion[];
  timeLimitMin: number;
  label: string;
}

/**
 * Mock exam runner (doc section 6.9): ENEM-like flow — question by question,
 * navigation grid, flag-for-review, global timer, final report.
 */
export function ExamRunner({ examId, questions, timeLimitMin, label }: ExamRunnerProps) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<
    Map<string, { selected: string | null; flagged: boolean }>
  >(() => new Map(questions.map((q) => [q.id, { selected: null, flagged: false }])));
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMin * 60);
  const [finishing, setFinishing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reduced = useReducedMotion();

  // Global countdown.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const question = questions[current];
  const answeredCount = useMemo(
    () => [...answers.values()].filter((a) => a.selected !== null).length,
    [answers],
  );

  function select(key: string) {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(question.id, { ...(next.get(question.id) ?? { selected: null, flagged: false }), selected: key });
      return next;
    });
  }

  function toggleFlag() {
    setAnswers((prev) => {
      const next = new Map(prev);
      const current = next.get(question.id) ?? { selected: null, flagged: false };
      next.set(question.id, { ...current, flagged: !current.flagged });
      return next;
    });
  }

  async function finish() {
    setFinishing(true);
    const result = await finishMockExam({
      examId,
      answers: questions.map((q) => ({
        questionId: q.id,
        selected: (answers.get(q.id)?.selected ?? null) as "A" | "B" | "C" | "D" | "E" | null,
        flagged: answers.get(q.id)?.flagged ?? false,
      })),
      timeSpentMin: Math.round((timeLimitMin * 60 - secondsLeft) / 60),
    });
    if (result.ok) {
      router.replace(`/simulado/${examId}`);
      return;
    }
    setFinishing(false);
    setConfirmOpen(false);
  }

  const timeUp = secondsLeft === 0;
  if (timeUp && !finishing) {
    void finish();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{label}</h1>
          <p className="text-xs text-muted-foreground">
            {answeredCount}/{questions.length} respondidas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm tabular-nums",
              secondsLeft < 300 ? "bg-destructive/10 text-destructive" : "bg-muted",
            )}
            role="timer"
          >
            <Timer className="h-4 w-4" aria-hidden="true" />
            {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
          </span>
          <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)}>
            Finalizar
          </Button>
        </div>
      </header>

      {/* Navigation grid */}
      <nav
        className="flex flex-wrap gap-1.5"
        aria-label="Navegação entre questões"
      >
        {questions.map((q, i) => {
          const state = answers.get(q.id);
          return (
            <button
              key={q.id}
              onClick={() => setCurrent(i)}
              aria-label={`Questão ${i + 1}${state?.selected ? " (respondida)" : ""}${state?.flagged ? " (marcada)" : ""}`}
              aria-current={i === current ? "true" : undefined}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-lg border text-sm tabular-nums transition-colors",
                i === current
                  ? "border-primary bg-primary text-primary-foreground"
                  : state?.selected
                    ? "border-success/60 bg-success/15 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50",
              )}
            >
              {i + 1}
              {state?.flagged ? (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent-2" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Question */}
      <motion.article
        key={question.id}
        initial={reduced ? undefined : { opacity: 0, x: 20 }}
        animate={reduced ? undefined : { opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Questão {current + 1} de {questions.length} · {question.areaName}
          </span>
          <Button variant="ghost" size="sm" onClick={toggleFlag} aria-pressed={answers.get(question.id)?.flagged}>
            <Flag
              className={cn(
                "h-4 w-4",
                answers.get(question.id)?.flagged ? "text-accent-2-ink" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            {answers.get(question.id)?.flagged ? "Marcada" : "Marcar p/ revisão"}
          </Button>
        </div>

        {question.context_md ? (
          <div className="mb-4 rounded-xl border border-border/60 bg-background/50 p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Texto-base
            </p>
            <Markdown content={question.context_md} />
          </div>
        ) : null}

        <Markdown content={question.statement_md} className="text-[1.05rem]" />

        <fieldset className="mt-6 space-y-2.5">
          <legend className="sr-only">Alternativas</legend>
          {question.alternatives.map((alt) => {
            const isSelected = answers.get(question.id)?.selected === alt.key;
            return (
              <button
                key={alt.key}
                type="button"
                onClick={() => select(alt.key)}
                aria-pressed={isSelected}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {alt.key}
                </span>
                <Markdown content={alt.text} compact className="min-w-0 flex-1" />
              </button>
            );
          })}
        </fieldset>
      </motion.article>

      {/* Prev/next */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Anterior
        </Button>
        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent((c) => c + 1)}>
            Próxima
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={() => setConfirmOpen(true)}>
            <Trophy className="h-4 w-4" aria-hidden="true" />
            Finalizar simulado
          </Button>
        )}
      </div>

      {/* Confirm dialog */}
      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar finalização"
        >
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Finalizar o simulado?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Você respondeu {answeredCount} de {questions.length} questões.
              {answeredCount < questions.length
                ? " As não respondidas contam como erro — tudo bem, também é informação."
                : " Vamos gerar seu relatório por área."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={finishing}>
                Continuar
              </Button>
              <Button onClick={() => void finish()} disabled={finishing}>
                {finishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Finalizar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
