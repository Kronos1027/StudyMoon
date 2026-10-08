"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Lightbulb,
  Loader2,
  Send,
  Timer,
  XCircle,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Markdown } from "@/components/content/markdown";
import { DemoFrame } from "@/components/demos/demo-frame";
import { TutorDialog } from "@/components/practice/tutor-dialog";
import { submitAttempt, reportQuestion, type AttemptResult } from "@/lib/practice/actions";
import type { QuestionPublic } from "@/lib/db/types";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: QuestionPublic;
  /** Practice mode label for the header. */
  mode: "practice" | "review" | "lesson_test";
  /** Callback to load the next question. */
  onNext: () => void;
  /** Reports the attempt outcome (fires once per question). */
  onAnswered?: (correct: boolean, xpEarned: number) => void;
  onFinish?: () => void;
  /** Stats for the session header. */
  sessionCount: number;
  sessionCorrect: number;
}

type Phase = "answering" | "submitting" | "feedback";

const REASONS = [
  { value: "wrong_answer", label: "Gabarito errado" },
  { value: "ambiguous", label: "Enunciado ambíguo" },
  { value: "offensive", label: "Conteúdo ofensivo" },
  { value: "broken", label: "Imagem/ formatagem quebrada" },
  { value: "other", label: "Outro" },
] as const;

export function QuestionCard({
  question,
  mode,
  onNext,
  onAnswered,
  onFinish,
  sessionCount,
  sessionCorrect,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<null | "A" | "B" | "C" | "D" | "E">(null);
  const [phase, setPhase] = useState<Phase>("answering");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [xpFloat, setXpFloat] = useState<number | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("wrong_answer");
  const [reportDone, setReportDone] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const startRef = useRef(Date.now());
  const reduced = useReducedMotion();

  const submittedRef = useRef(false);

  // NOTE: state reset happens via the parent's key={question.id} remount.

  // Optional timer (ticks while answering).
  useEffect(() => {
    if (!timerOn || phase !== "answering") return;
    const interval = setInterval(() => {
      setElapsed(Math.round((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerOn, phase, question.id]);

  const hints = Array.isArray(question.hints) ? question.hints : [];

  const submit = useCallback(async () => {
    if (!selected || phase !== "answering") return;
    setPhase("submitting");
    setActionError(null);
    const timeMs = Date.now() - startRef.current;
    const response = await submitAttempt({
      questionId: question.id,
      selected,
      timeMs,
      mode,
    });
    if (!response.ok) {
      setActionError(response.error ?? "Erro inesperado.");
      setPhase("answering");
      return;
    }
    setResult(response);
    setPhase("feedback");
    if ((response.xpEarned ?? 0) > 0) {
      setXpFloat(response.xpEarned ?? 0);
      setTimeout(() => setXpFloat(null), 1800);
    }
    if (!submittedRef.current) {
      submittedRef.current = true;
      onAnswered?.(response.correct === true, response.xpEarned ?? 0);
    }
  }, [selected, phase, question.id, mode, onAnswered]);

  // Keyboard: 1-5/A-E select, Enter submit/advance.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (reportOpen) return;
      if (phase === "answering") {
        const key = event.key.toUpperCase();
        const map: Record<string, "A" | "B" | "C" | "D" | "E"> = {
          A: "A", B: "B", C: "C", D: "D", E: "E",
          "1": "A", "2": "B", "3": "C", "4": "D", "5": "E",
        };
        if (map[key]) setSelected(map[key]);
        else if (event.key === "Enter" && selected) void submit();
      } else if (phase === "feedback" && event.key === "Enter") {
        onNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, selected, submit, onNext, reportOpen]);

  async function sendReport() {
    setReportDone(false);
    const response = await reportQuestion({
      questionId: question.id,
      reason: reportReason as (typeof REASONS)[number]["value"],
    });
    if (response.ok) {
      setReportDone(true);
      setTimeout(() => setReportOpen(false), 1200);
    }
  }

  const accuracy =
    sessionCount > 0 ? Math.round((sessionCorrect / sessionCount) * 100) : null;
  const isCorrect = result?.correct === true;

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      {/* Floating +XP */}
      <AnimatePresence>
        {xpFloat !== null ? (
          <motion.div
            className="pointer-events-none absolute -top-4 left-1/2 z-20 flex items-center gap-1 rounded-full bg-brand-gradient px-3 py-1 text-sm font-bold text-white"
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: -18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ x: "-50%" }}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />+{xpFloat} XP
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="rounded-full border border-border bg-card px-3 py-1">
          {mode === "review" ? "Revisão" : mode === "lesson_test" ? "Teste do tópico" : "Prática"} ·{" "}
          {sessionCount} respondidas
          {accuracy !== null ? ` · ${accuracy}% de acerto` : ""}
        </span>
        <div className="flex items-center gap-2">
          {phase === "answering" ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTimerOn((t) => !t)}
                aria-pressed={timerOn}
              >
                <Timer className="h-4 w-4" aria-hidden="true" />
                {timerOn ? formatTime(elapsed) : "Cronômetro"}
              </Button>
              <TutorDialog questionId={question.id} hintsShown={hintsShown} />
            </>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
            <Flag className="h-4 w-4" aria-hidden="true" />
            Reportar
          </Button>
        </div>
      </div>

      {/* Question */}
      <motion.article
        key={question.id}
        initial={reduced ? undefined : { opacity: 0, y: 16 }}
        animate={reduced ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "rounded-2xl border bg-card p-5 sm:p-6",
          phase === "feedback"
            ? isCorrect
              ? "border-success/60"
              : "border-destructive/60"
            : "border-border",
        )}
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

        {/* Alternatives */}
        <fieldset className="mt-6 space-y-2.5" disabled={phase !== "answering"}>
          <legend className="sr-only">Alternativas</legend>
          {question.alternatives.map((alt) => {
            const isSelected = selected === alt.key;
            const isAnswer = phase === "feedback" && result?.answerKey === alt.key;
            const isWrongPick =
              phase === "feedback" && isSelected && result?.answerKey !== alt.key;
            return (
              <motion.button
                key={alt.key}
                type="button"
                onClick={() => phase === "answering" && setSelected(alt.key)}
                aria-pressed={isSelected}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all",
                  "hover:border-primary/50 focus-visible:border-primary",
                  phase === "answering" && isSelected && "border-primary bg-primary/10",
                  phase === "answering" && !isSelected && "border-border",
                  isAnswer && "border-success bg-success/10",
                  isWrongPick && "border-destructive bg-destructive/10",
                )}
                animate={
                  isWrongPick && !reduced ? { x: [0, -8, 8, -5, 5, 0] } : undefined
                }
                transition={{ duration: 0.4 }}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                    phase === "answering" && isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                    isAnswer && "border-success bg-success text-success-foreground",
                    isWrongPick && "border-destructive bg-destructive text-destructive-foreground",
                  )}
                  aria-hidden="true"
                >
                  {alt.key}
                </span>
                <Markdown content={alt.text} compact className="min-w-0 flex-1" />
                {isAnswer ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                ) : null}
                {isWrongPick ? (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                ) : null}
              </motion.button>
            );
          })}
        </fieldset>

        {/* Layered hints */}
        {phase === "answering" && hints.length > 0 ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: hintsShown }, (_, i) => (
              <motion.div
                key={i}
                initial={reduced ? undefined : { opacity: 0, height: 0 }}
                animate={reduced ? undefined : { opacity: 1, height: "auto" }}
                className="overflow-hidden"
              >
                <div className="flex items-start gap-2 rounded-xl border border-accent-2/30 bg-accent-2/5 p-3 text-sm">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent-2-ink" aria-hidden="true" />
                  <p>{hints[i]}</p>
                </div>
              </motion.div>
            ))}
            {hintsShown < hints.length ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setHintsShown((h) => h + 1)}
                className="text-accent-2-ink"
              >
                <Lightbulb className="h-4 w-4" aria-hidden="true" />
                Dica {hintsShown + 1} de {hints.length}
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Feedback */}
        <AnimatePresence>
          {phase === "feedback" && result ? (
            <motion.div
              initial={reduced ? undefined : { opacity: 0, y: 12 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              className="mt-6 space-y-4"
              role="status"
            >
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl p-4",
                  isCorrect ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                )}
              >
                {isCorrect ? (
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <XCircle className="h-6 w-6" aria-hidden="true" />
                )}
                <p className="font-medium">
                  {isCorrect ? "Acertou!" : `Resposta correta: ${result.answerKey}`}
                  {typeof result.masteryPercent === "number" ? (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      domínio do tópico: {result.masteryPercent}%
                    </span>
                  ) : null}
                </p>
              </div>

              <div className="rounded-xl border border-border p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Resolução passo a passo
                </p>
                <Markdown content={result.explanationMd ?? ""} />
              </div>

              {question.demo_id && !isCorrect ? (
                <div className="rounded-xl border border-border p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Veja o conceito em movimento
                  </p>
                  <DemoFrame demoId={question.demo_id} compact />
                </div>
              ) : null}

              {result.newLevel ? (
                <div className="rounded-xl bg-brand-gradient p-4 text-center font-semibold text-white">
                  Nível {result.newLevel} alcançado — a lua fica mais cheia!
                </div>
              ) : null}

              <p className="text-center text-xs text-muted-foreground">
                Conteúdo gerado com apoio de IA pode conter erros —{" "}
                <button className="underline" onClick={() => setReportOpen(true)}>
                  reportar problema nesta questão
                </button>
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {actionError ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-destructive" role="alert">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {actionError}
          </p>
        ) : null}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {phase !== "feedback" ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Teclas 1-5 ou A-E selecionam · Enter envia
              </span>
              <Button
                onClick={() => void submit()}
                disabled={!selected}
                size="lg"
              >
                {phase === "submitting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
                Responder
              </Button>
            </>
          ) : (
            <>
              {onFinish ? (
                <Button variant="outline" onClick={onFinish}>
                  Encerrar sessão
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={onNext} size="lg">
                Próxima questão
              </Button>
            </>
          )}
        </div>
      </motion.article>

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar problema na questão</DialogTitle>
            <DialogDescription>
              Questões com 2+ relatos saem de circulação até revisão. Obrigado
              por ajudar a manter a qualidade do banco.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {REASONS.map((reason) => (
              <button
                key={reason.value}
                type="button"
                onClick={() => setReportReason(reason.value)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  reportReason === reason.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50",
                )}
              >
                {reason.label}
              </button>
            ))}
          </div>
          <DialogFooter>
            {reportDone ? (
              <p className="text-sm text-success">Relato enviado. Obrigado!</p>
            ) : (
              <Button onClick={() => void sendReport()}>Enviar relato</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
