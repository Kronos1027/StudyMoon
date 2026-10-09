# DECISIONS.md — Registro de decisões técnicas

Cada decisão tem contexto e consequências. Nada aqui é imutável, mas mudanças devem registrar uma nova entrada.

---

## D-001 — Repositório público
**Data:** 2026-10-09 · **Contexto:** GitHub Actions cobra minutos em repositório privado; o agendador de lembretes roda a cada 15 min (~2.880 execuções/mês), inviável no limite privado.
**Decisão:** O repositório `Kronos1027/StudyMoon` é **público**, conforme o plano do documento mestre (seção 2). Nenhum segredo entra no código (`.env*` no `.gitignore`, verificação com gitleaks no CI).
**Consequências:** Minutes ilimitados do Actions; obrigação permanente de varrer segredos antes de cada push.

## D-002 — Modelo Gemini: `gemini-3.8-flash`
**Contexto:** O documento pedia `gemini-1.5-flash` (descontinuado há tempos). Teste real contra a API em 2026-10-09: `gemini-2.0-flash` retorna 404 "no longer available" e a própria API respondeu sugerindo `gemini-3.8-flash`.
**Decisão:** `GEMINI_MODEL=gemini-3.8-flash` como padrão no `.env.example`. O nome do modelo vive SEMPRE em variável de ambiente.
**Consequências:** Se o Google descontinuar, basta trocar a variável; o roteador de IA registra o erro do provedor e cai para o próximo.

## D-003 — Service worker manual em vez de Serwist
**Contexto:** O documento sugeria Serwist. Next.js 16 faz build com Turbopack por padrão, e o plugin do Serwist é para webpack (não roda em build Turbopack).
**Decisão:** Service worker escrito à mão (`public/sw.js`): offline shell, cache de estáticos e handler de push. Sem dependências, auditável, ~150 linhas.
**Consequências:** Menos recursos de pré-cache automático (aceitável: o produto precisa de offline para aulas já abertas, não para o app inteiro). Se o Serwist passar a suportar Turbopack, pode-se migrar.

## D-004 — Estrutura `src/` (mapa do documento mestre)
**Contexto:** O documento mestre lista `/app`, `/components`, `/lib` na raiz; o scaffold usa `src/`.
**Decisão:** Manter `src/app`, `src/components`, `src/lib` (convencional do Next.js e exigido pelo ambiente). O mapa semântico do documento é preservado: `src/components/demos` = simuladores, `src/lib/ai` = providers/roteador/prompts/schemas, etc.
**Consequências:** Nenhuma funcional; apenas convenção de diretório.

## D-005 — `pnpm verify` sem build local
**Contexto:** O documento pede `verify` = lint + typecheck + testes + build. O ambiente de desenvolvimento tem restrição de recursos que desaconselha build completo local; o CI do GitHub roda o build de qualquer forma.
**Decisão:** `pnpm verify` = lint + typecheck + testes. `pnpm verify:full` = verify + build (usado no CI e disponível para o usuário).
**Consequências:** O build é verificado em todo push pelo CI; localmente o loop fica rápido.

## D-006 — Supabase Auth em vez de NextAuth
**Contexto:** O documento especifica Supabase Auth (e-mail/senha + Google OAuth) com sessão por cookie.
**Decisão:** `@supabase/ssr` com middleware de refresh de sessão. NextAuth removido do projeto.
**Consequências:** RLS pode usar `auth.uid()` de forma nativa; um único sistema de identidade (banco + auth).

## D-007 — Lições em JSON/Markdown em vez de MDX
**Contexto:** O documento menciona `topics/*.mdx`. MDX exige toolchain extra (`@next/mdx`) para ganho pequeno: as lições são texto + componentes de demonstração bem definidos.
**Decisão:** Explicações de lição como Markdown (renderizado com `react-markdown`) + campos estruturados para o id do simulador e vídeos. Conteúdo versionado em `content/`.
**Consequências:** Menos dependências; o gerador de conteúdo da IA produz Markdown/JSON simples, mais fácil de validar com Zod.

## D-008 — Chaves Supabase novo formato
**Contexto:** Supabase migrou para chaves `sb_publishable_` / `sb_secret_` (substituem `anon` / `service_role`). O usuário forneceu a `sb_secret_`.
**Decisão:** Variáveis: `SUPABASE_ANON_KEY` (publishable, uso no cliente) e `SUPABASE_SECRET_KEY` (só servidor). O SDK `@supabase/supabase-js` 2.117+ aceita os novos formatos.
**Consequências:** `SUPABASE_SECRET_KEY` jamais é exposta ao browser; tudo que a usa roda em Route Handlers/Server Actions.

## D-009 — Gráficos de funções com SVG próprio (sem JSXGraph)
**Contexto:** O documento sugere JSXGraph para gráficos de funções. JSXGraph (~1 MB) tem integração React/SSR frágil e tema difícil de casar com o design system escuro.
**Decisão:** Simuladores de funções desenhados com SVG próprio (componente `Plotter`): curvas, vértice e raízes em tempo real com controles. Gráficos de dados continuam com Recharts.
**Consequências:** Zero dependência extra, animação 60 fps via `transform`, acessibilidade nativa (ARIA). Se um dia for preciso arrastar pontos como no GeoGebra, JSXGraph entra por demanda.

## D-010 — Idioma e escopo das chaves de IA
**Contexto:** Teste real (2026-10-09): o IP do ambiente de desenvolvimento (Hong Kong) é bloqueado pelo Gemini ("User location is not supported") e pelo Groq ("Forbidden"). Ambas as chaves são válidas e funcionarão na infraestrutura da Vercel.
**Decisão:** O roteador de IA tem um provider `mock` para testes locais/unitários; as chamadas reais usam a ordem Gemini → Groq → Cerebras → OpenRouter. O usuário vai fornecer a chave OpenRouter (que não tem bloqueio geográfico) para teste ao vivo durante o desenvolvimento.
**Consequências:** Testes de unidade do roteador não dependem de rede; validação real da IA acontece na Vercel ou com OpenRouter.

## D-011 — REGRA PERMANENTE: criação de simuladores (auditoria de demos)
**Data:** 2026-10-09 · **Contexto:** Bug recorrente "Veja o conceito em movimento desligado do assunto" — a demo já foi vinculada à ÁREA (quadro de Punnett em questão de eutrofização), depois ao TÓPICO (alavanca de FÍSICA e tabela de arroz na questão de ESCALA DE MAPA, com a balança inclinando mesmo em equilíbrio). Causa raiz: demos genéricas agrupando vários assuntos, vinculadas por granularidade larga.
**Decisão (REGRA PERMANENTE — nenhum simulador novo pode ser criado sem os 3 itens):**
1. **Vínculo a um subtópico** — entrada em `TOPIC_SUBTOPICS` (`src/lib/demos/subtopics.ts`) com `demoId` no subtópico certo; jamais vínculo por tópico/área. A demo exibida por uma questão vem SEMPRE do subtópico da própria questão (`questions.subtopic` → `resolveDemoForQuestion`); subtópico sem simulador ⇒ NENHUMA demo. Demo de área X jamais aparece em questão de área Y (teste de regressão).
2. **Testes numéricos** — toda conta exibida é calculada por `src/lib/demos/models.ts` (função pura) e coberta por `tests/unit/demo-models.test.ts` com ≥ 5 valores, incluindo estados limite (0, mínimos, máximos) e coerência visual (ex.: alavanca horizontal ⇔ torques iguais). Texto nunca substitui cálculo.
3. **Entrada no `docs/DEMO_AUDIT.md`** — gerado/validado por `bun scripts/audit-demos.ts` (id, arquivo, área, subtópicos, questões que exibem, textos/fórmulas, problemas/justificativas).
**Consequências:** A regra é garantida por `tests/unit/demo-subtopic-binding.test.ts` + E2E `tests/e2e/demos.spec.ts` (fluxo por subtópico, áreas, snapshots). Demo errada é pior que nenhuma demo — quando não houver simulador adequado, o StudyMoon mostra a resolução sem simulador.
