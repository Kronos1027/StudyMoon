"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Loader2, PartyPopper, RefreshCw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/practice/question-card";
import { getNextQuestion } from "@/lib/practice/actions";
import type { QuestionPublic } from "@/lib/db/types";

interface PracticeSessionProps {
  topicSlug: string | null;
  mode: "practice" | "review" | "lesson_test";
  /** Fixed number of questions (topic test): session ends automatically. */
  testLength?: number | null;
}

/**
 * Adaptive practice session: loads the next question through the server
 * action (70/20/10 selection) and tracks session stats.
 */
export function PracticeSession({ topicSlug, mode, testLength }: PracticeSessionProps) {
  const searchParams = useSearchParams();
  const effectiveTopic = topicSlug ?? searchParams.get("topico");

  const [question, setQuestion] = useState<QuestionPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [count, setCount] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [xpTotal, setXpTotal] = useState(0);
  const reduced = useReducedMotion();

  const loadNext = useCallback(async () => {
    setLoading(true);
    const result = await getNextQuestion({
      topicSlug: effectiveTopic,
      mode: mode === "review" ? "review" : "practice",
    });
    setQuestion(result.question);
    setLoading(false);
    if (!result.question) setFinished(true);
  }, [effectiveTopic, mode]);

  // Initial load: async setState only (no sync setState inside the effect).
  useEffect(() => {
    let cancelled = false;
    getNextQuestion({
      topicSlug: effectiveTopic,
      mode: mode === "review" ? "review" : "practice",
    }).then((result) => {
      if (cancelled) return;
      setQuestion(result.question);
      setLoading(false);
      if (!result.question) setFinished(true);
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveTopic, mode]);

  const handleAnswered = useCallback(
    (wasCorrect: boolean, xp: number) => {
      setCount((c) => c + 1);
      if (wasCorrect) setCorrect((c) => c + 1);
      setXpTotal((x) => x + xp);
    },
    [],
  );

  function next() {
    if (testLength !== null && testLength !== undefined && count >= testLength) {
      setFinished(true);
      setQuestion(null);
      return;
    }
    void loadNext();
  }

  function restart() {
    setCount(0);
    setCorrect(0);
    setXpTotal(0);
    setFinished(false);
    setQuestion(null);
    void loadNext();
  }

  const accuracy = count > 0 ? Math.round((correct / count) * 100) : null;
  const passedTest = testLength ? (correct / Math.max(1, testLength)) * 100 >= 80 : false;

  if (loading && !question) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <p className="text-sm">Escolhendo a questão ideal para você...</p>
      </div>
    );
  }

  if (finished || !question) {
    return (
      <motion.div
        className="flex flex-col items-center gap-5 py-12 text-center"
        initial={reduced ? undefined : { opacity: 0, y: 16 }}
        animate={reduced ? undefined : { opacity: 1, y: 0 }}
      >
        {count > 0 ? (
          <>
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient">
              {testLength && passedTest ? (
                <Trophy className="h-8 w-8 text-white" aria-hidden="true" />
              ) : (
                <PartyPopper className="h-8 w-8 text-white" aria-hidden="true" />
              )}
            </span>
            <div>
              <h2 className="text-xl font-semibold">
                {testLength
                  ? passedTest
                    ? "Aula concluída!"
                    : "Teste concluído"
                  : "Sessão concluída"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {count} questões · {correct} acertos
                {accuracy !== null ? ` (${accuracy}%)` : ""} · {xpTotal} XP ganhos
              </p>
              {testLength && !passedTest ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Meta do teste: 80%. Revise a explicação e tente de novo — a
                  prática fixa o aprendizado.
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <BookOpen className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <p className="max-w-sm text-sm text-muted-foreground">
              Ainda não há questões disponíveis
              {effectiveTopic ? " para este tópico" : ""}. O gerador noturno
              está produzindo mais — volte amanhã ou escolha outro tópico.
            </p>
          </>
        )}
        <div className="flex gap-3">
          {count > 0 ? (
            <Button variant="outline" onClick={() => window.history.back()}>
              Voltar
            </Button>
          ) : null}
          <Button onClick={restart}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Nova sessão
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      {testLength ? (
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Teste do tópico: {Math.min(count, testLength)}/{testLength} respondidas
        </p>
      ) : null}
      <QuestionCard
        key={question.id}
        question={question}
        mode={mode}
        onNext={next}
        onAnswered={handleAnswered}
        sessionCount={count}
        sessionCorrect={correct}
      />
    </div>
  );
}
