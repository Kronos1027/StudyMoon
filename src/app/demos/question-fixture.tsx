"use client";

import { useCallback } from "react";
import { QuestionCard } from "@/components/practice/question-card";
import type { AttemptResult } from "@/lib/practice/actions";
import type { QuestionPublic } from "@/lib/db/types";

/**
 * Fixture de questão para a galeria /demos (E2E do PASSO 5).
 * Substitui a action real por um resolvedor local (sem banco/backend):
 * acerta ⇒ gabarito da própria fixture; erra ⇒ mostra o feedback com a
 * resolução e o simulador do subtópico. É o mesmo componente usado em
 * produção — apenas a action é injetada.
 */
export function QuestionFixture({
  question,
  explanation,
  answerKey,
  onAnswered,
}: {
  question: QuestionPublic;
  explanation: string;
  answerKey: "A" | "B" | "C" | "D" | "E";
  onAnswered?: (id: string) => void;
}) {
  const submitter = useCallback(
    async (input: {
      questionId: string;
      selected: "A" | "B" | "C" | "D" | "E";
    }): Promise<AttemptResult> => {
      await new Promise((r) => setTimeout(r, 150)); // simula latência da action
      const correct = input.selected === answerKey;
      return {
        ok: true,
        correct,
        answerKey,
        explanationMd: explanation,
        xpEarned: correct ? 10 : 0,
        masteryPercent: 42,
      };
    },
    [answerKey, explanation],
  );

  const reporter = useCallback(async () => ({ ok: true }), []);

  return (
    <div
      data-question-fixture
      data-subtopic={question.subtopic ?? ""}
      data-demo={question.demo_id ?? ""}
      data-answerkey={answerKey}
    >
      <QuestionCard
        question={question}
        mode="practice"
        onNext={() => undefined}
        onAnswered={onAnswered ? () => onAnswered(question.id) : undefined}
        onFinish={undefined}
        sessionCount={0}
        sessionCorrect={0}
        submitter={submitter}
        reporter={reporter}
      />
    </div>
  );
}
