-- ============================================================================
-- 0006 — Vínculo de demo por SUBTÓPICO (PASSO 2 da auditoria de simuladores)
--
-- A demo exibida com uma questão passa a ser resolvida do SUBTÓPICO da
-- questão (`subtopic`, slug local do catálogo em src/lib/demos/subtopics.ts),
-- nunca do tópico nem da área. `demo_id` continua existindo apenas como
-- espelho de higiene (scripts/sync-demo-bindings.ts).
--
-- `numeric_expr` guarda a expressão + resultado do check determinístico
-- (mathjs) para que auditorias futuras re-verifiquem o gabarito sem
-- precisar re-casar o enunciado com as seeds.
-- ============================================================================

alter table public.questions
  add column if not exists subtopic text,
  add column if not exists demo_params jsonb,
  add column if not exists numeric_expr jsonb;

comment on column public.questions.subtopic is
  'Slug LOCAL do subtópico da questão (catálogo: src/lib/demos/subtopics.ts). A demo exibida é resolvida dele — null significa sem subtópico (e, portanto, sem demo).';

comment on column public.questions.demo_params is
  'Parâmetros da demo para ESTA questão (ex.: {"distanceCm":4.5,"scale":200000}), mesclados sobre os padrões do subtópico.';

comment on column public.questions.numeric_expr is
  'Check numérico determinístico (mathjs): {"expression":"4.5*200000/100000","result":"9"}. Re-verificável a qualquer momento.';

-- índice para agrupar/auditar por subtópico
create index if not exists questions_subtopic_idx on public.questions (subtopic);
