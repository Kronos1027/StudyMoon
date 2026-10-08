"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Markdown } from "@/components/content/markdown";
import {
  getLevelTestState,
  answerLevelTestQuestion,
  type LevelTestQuestion,
} from "@/lib/level-test/actions";
import { cn } from "@/lib/utils";

/**
 * Adaptive level test runner (~doc section 6.4): ~16 questions, 4 per area,
 * difficulty adjusts to answers; pauses between areas. Produces the initial
 * topic_mastery map used by the dashboard and the planner.
 */
export function LevelTestRunner() {
  const router = useRouter();
  const [question, setQuestion] = useState<LevelTestQuestion | null>(null);
  const [answered, setAnswered] = useState(0);
  const [total, setTotal] = useState(16);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef(Date.now());
  const reduced = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    getLevelTestState().then((result) => {
      if (cancelled || !result.ok) return;
      setQuestion(result.state.question);
      setAnswered(result.state.answered);
      setTotal(result.state.total);
      setFinished(result.state.finished);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    if (!selected || !question || submitting) return;
    setSubmitting(true);
    const result = await answerLevelTestQuestion({
      questionId: question.id,
      selected: selected as "A" | "B" | "C" | "D" | "E",
      timeMs: Date.now() - startRef.current,
    });
    setSubmitting(false);
    if (!result.ok) return;
    setQuestion(result.state.question);
    setAnswered(result.state.answered);
    setFinished(result.state.finished);
    setSelected(null);
    startRef.current = Date.now();
  }

  if (loading) {
    return (
      <div className="flex h-72 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <p className="text-sm">Calibrando as primeiras questões...</p>
      </div>
    );
  }

  if (finished) {
    return (
      <motion.div
        className="flex flex-col items-center gap-5 py-12 text-center"
        initial={reduced ? undefined : { opacity: 0, y: 16 }}
        animate={reduced ? undefined : { opacity: 1, y: 0 }}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient">
          <Rocket className="h-8 w-8 text-white" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-semibold">Teste concluído!</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            O StudyMoon mapeou seu ponto de partida nas 4 áreas. Seu painel e
            seu plano já refletem esse mapa — e tudo se ajusta a cada questão
            que você responde.
          </p>
        </div>
        <Button size="lg" onClick={() => router.push("/painel")}>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Ver meu painel
        </Button>
      </motion.div>
    );
  }

  if (!question) return null;

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {question.areaName} · rodada {question.round}/{question.totalRounds}
          </span>
          <span className="tabular-nums">
            {answered + 1}/{total}
          </span>
        </div>
        <Progress value={(answered / total) * 100} aria-label="Progresso do teste" />
      </div>

      {/* Question */}
      <motion.article
        key={question.id}
        initial={reduced ? undefined : { opacity: 0, y: 14 }}
        animate={reduced ? undefined : { opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
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
            const isSelected = selected === alt.key;
            return (
              <button
                key={alt.key}
                type="button"
                onClick={() => setSelected(alt.key)}
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

        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => void submit()}
            disabled={!selected || submitting}
            size="lg"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {submitting ? "Registrando..." : "Responder"}
          </Button>
        </div>
      </motion.article>

      <p className="text-center text-xs text-muted-foreground">
        Pode pausar quando quiser: o teste retoma daqui quando você voltar.
      </p>
    </div>
  );
}
