/**
 * Demo ↔ topic binding (bugfix: "Veja o conceito em movimento" aparecia
 * desligado do assunto da questão — ex.: quadro de Punnett em questão de
 * eutrofização).
 *
 * RULE: a simulator is bound to a specific topic, never to an area. The
 * demo displayed with a question is ALWAYS the demo of the question's OWN
 * topic, resolved from `topics.demo_id` via a PostgREST embed — never from
 * the `questions.demo_id` column. Topics without a simulator (demo_id null)
 * show no demo at all: an honest nothing beats a wrong simulator.
 *
 * The embed `topics(demo_id)` rides the questions.topic_id → topics.id FK
 * and returns `{ topics: { demo_id } | null }`, which the queries flatten
 * back into `QuestionPublic.demo_id`.
 */

/** Shape of the PostgREST `topics(demo_id)` embed on a question row. */
export interface TopicDemoEmbed {
  demo_id: string | null;
}

/**
 * Flattens the `topics(demo_id)` embed into the public `demo_id` field.
 * Accepts the single-object shape (PostgREST many-to-one) and the array
 * shape (supabase-js default types). `null`/missing/empty embed (topic
 * without simulator) resolves to null → no demo.
 */
export function demoIdFromTopicEmbed(
  embed: TopicDemoEmbed | TopicDemoEmbed[] | null | undefined,
): string | null {
  if (!embed) return null;
  const row = Array.isArray(embed) ? embed[0] : embed;
  return row?.demo_id ?? null;
}
