/**
 * Demo ↔ question resolution (PASSO 2 da auditoria de simuladores).
 *
 * Histórico: a demo já foi vinculada à ÁREA (quadro de Punnett em questão de
 * eutrofização) e depois ao TÓPICO (demo "razao-proporcao" — uma alavanca
 * de FÍSICA e uma tabela de arroz — aparecia na questão de ESCALA DE MAPA).
 *
 * REGRA ATUAL (subtópico): o simulador exibido com uma questão vem do
 * SUBTÓPICO declarado pela questão (`questions.subtopic`), resolvido no
 * CÓDIGO pelo catálogo de src/lib/demos/subtopics.ts — nunca do tópico,
 * nunca da área, nunca da coluna questions.demo_id (que hoje é apenas um
 * espelho de higiene mantido por scripts/sync-demo-bindings.ts).
 * Subtópico sem simulador ⇒ NENHUMA demo: nada é melhor que demo errada.
 */

import { resolveDemoForQuestion, type DemoParam } from "@/lib/demos/subtopics";

/** Shape of the PostgREST `topics(slug)` embed on a question row. */
export interface TopicSlugEmbed {
  slug: string;
}

export interface ResolvedDemo {
  demoId: string;
  params: Record<string, DemoParam>;
}

/**
 * Resolves the demo a question may display, from the question's own
 * subtopic. Accepts the `topics(slug)` embed (single object or array —
 * supabase-js may return either) plus the question's subtopic/demo_params.
 * Returns null whenever there is no exact subtopic match → no demo.
 */
export function demoForQuestionRow(args: {
  topicEmbed: TopicSlugEmbed | TopicSlugEmbed[] | null | undefined;
  subtopic: string | null | undefined;
  demoParams?: Record<string, unknown> | null;
}): ResolvedDemo | null {
  if (!args.topicEmbed) return null;
  const row = Array.isArray(args.topicEmbed) ? args.topicEmbed[0] : args.topicEmbed;
  if (!row?.slug) return null;
  return resolveDemoForQuestion(
    row.slug,
    args.subtopic ?? null,
    (args.demoParams ?? null) as Record<string, DemoParam | null | undefined> | null,
  );
}
