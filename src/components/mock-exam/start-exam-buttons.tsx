"use client";

import { useState } from "react";
import { Loader2, Play, Zap } from "lucide-react";
import { startMockExam } from "@/lib/mock-exam/actions";
import { ExamRunner } from "./exam-runner";
import type { ExamQuestion } from "@/lib/mock-exam/actions";

const MODES = [
  {
    kind: "partial" as const,
    title: "Simulado parcial",
    description: "12 questões misturando as 4 áreas · 25 minutos. O treino do dia a dia.",
    icon: Zap,
    highlighted: true,
  },
  {
    kind: "day1" as const,
    title: "Dia 1 — Linguagens + Humanas",
    description: "20 questões focadas em LC e CH · 45 minutos (na prova real são 5h30 com redação).",
    icon: Play,
    highlighted: false,
  },
  {
    kind: "day2" as const,
    title: "Dia 2 — Natureza + Matemática",
    description: "20 questões focadas em CN e MT · 45 minutos (na prova real são 5h).",
    icon: Play,
    highlighted: false,
  },
];

/** Mode picker that starts the exam inline (no page navigation). */
export function StartExamButtons() {
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{
    examId: string;
    questions: ExamQuestion[];
    timeLimitMin: number;
    label: string;
  } | null>(null);

  async function start(kind: "partial" | "day1" | "day2") {
    setStarting(kind);
    setError(null);
    const result = await startMockExam({ kind });
    setStarting(null);
    if (!result.ok || !result.questions) {
      setError(result.error ?? "Não foi possível iniciar agora.");
      return;
    }
    setSession({
      examId: result.examId!,
      questions: result.questions,
      timeLimitMin: result.timeLimitMin ?? 25,
      label: result.label ?? "Simulado",
    });
  }

  if (session) {
    return (
      <ExamRunner
        examId={session.examId}
        questions={session.questions}
        timeLimitMin={session.timeLimitMin}
        label={session.label}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.kind}
              type="button"
              onClick={() => void start(mode.kind)}
              disabled={starting !== null}
              className={
                mode.highlighted
                  ? "flex flex-col gap-2 rounded-2xl bg-brand-gradient p-5 text-left text-white transition-transform hover:scale-[1.01] disabled:opacity-70"
                  : "flex flex-col gap-2 rounded-2xl border-2 border-border bg-card p-5 text-left transition-colors hover:border-primary/60 disabled:opacity-70"
              }
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span className="font-semibold leading-tight">{mode.title}</span>
              <span
                className={`text-xs leading-relaxed ${
                  mode.highlighted ? "text-white/85" : "text-muted-foreground"
                }`}
              >
                {mode.description}
              </span>
              {starting === mode.kind ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
