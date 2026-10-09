# PROGRESS.md — StudyMoon

Última atualização: 2026-10-09 (sessão 4b — **PRODUÇÃO VALIDADA**: deploy Vercel ativo, env vars corrigidas, auth round-trip real, cron protegido, Lighthouse desktop 100/mobile 93)

Se o contexto for reiniciado: leia este arquivo + `docs/DECISIONS.md` + `docs/KNOWN_ISSUES.md` e retome de onde parou.

## Fases

| Fase | Status | Notas |
| --- | --- | --- |
| 0 — Fundação | ✅ concluída | repo público, TS estrito, tokens, CI verde, PWA base, docs |
| 1 — Dados e login | ✅ concluída | **Banco provisionado e validado ao vivo**: 5 migrações aplicadas (26 tabelas + RLS + grants + índices), seed importado (5 áreas/ 80 tópicos/ 66 lições/ 35 questões/ 8 medalhas/ 6 temas), RLS 10/10 PASS, E2E completo no navegador (login → onboarding → prática → XP → FSRS → Elo) |
| 2 — Identidade visual e painel | ✅ concluída | splash canvas, shell, painel completo com dados reais, tema claro/escuro |
| 3 — Currículo e aulas | ✅ concluída | 5 áreas/ 21 disciplinas/ 66 tópicos (matriz INEP), 56 lições, 14 simuladores interativos. **Vídeos: 66/66 tópicos com 1 vídeo real validado via oEmbed** (canais: Ferretto, Noslen, Biologia com Samuel, Descomplica, Gabriel Cabral etc.) |
| 4 — Prática, domínio e revisão | ✅ concluída | 35 questões seed validadas (Zod + mathjs), seleção 70/20/10, Elo, FSRS, dicas em camadas, feedback animado, fila de revisão |
| 5 — Teste de nível e planejador | ✅ concluída | teste de nível adaptativo (16 questões); card "Agenda de hoje" no painel consome `generatePlan` com deep-links e estados vazios honestos |
| 6 — IA e motor de conteúdo | ✅ concluída | roteador com fallback + circuit breaker (8 testes), cache, tutor socrático com rate limit, pipeline noturno com validação em 4 camadas |
| 7 — Redação e simulados | ✅ concluída | 6 temas originais, editor com timer 30min/ modo prova, correção pela rubrica (5×200, degraus de 40), simulados parcial/dia1/dia2 com relatório |
| 8 — Cuidado e engajamento | ✅ concluída | push VAPID + escalada gentil (máx 2/dia, silêncio 22h-7h), XP antifraude, ligas, 8 medalhas, workflows Actions |
| 9 — Robustez e entrega | ✅ concluída | keepalive + backup semanal + offline + privacidade/LGPD + exportar/apagar + gitleaks no CI + **deploy Vercel validado** (auth real, cron, guard) + **Lighthouse desktop 100/100/96/100 e mobile 93/100/96/100**; push em aparelho real ainda pendente (exige usuário) |

## Aceites verificados nesta sessão (2)

- `pnpm verify` (lint + typecheck + testes): **verde, 75/75 testes** (após planejador no painel)
- Supabase ao vivo: **GoTrue ativo (v2.197.0), publishable key válida, signup real criado e removido via admin API**
- Login com credenciais inválidas: **round-trip completo browser → server action → GoTrue → mensagem amigável em PT-BR**
- Guard de autenticação (`proxy.ts`): **redirects `/painel` e `/estudo` → `/login?next=...` contra o projeto real**
- Vídeos: **`pnpm check-videos` → 66 verificados, 0 removidos** (cada ID confirmado pelo oEmbed)
- gitleaks 8.30.1 sobre os 22 commits do histórico: **0 leaks**

## Aceites verificados na sessão 1

- `pnpm verify` (lint + typecheck + testes): **verde, 75/75 testes**
- Splash, login, redirects, offline: **verificados no navegador**
- Fallback de provedores de IA: **testado em unidade (429, 5xx, retry, circuito)**
- Validação determinística de conteúdo: **35/35 questões passando**
- Perfis fraco/forte geram planos diferentes: **testado em unidade**

## Próximos passos (sessão 2 — restantes)

1. **BLOQUEADO na senha do banco**: o usuário mandou a Connection string com `[YOUR-PASSWORD]` (placeholder do dashboard). Quando a senha real chegar: `.env` → `pnpm setup` (no sandbox: `node --experimental-strip-types scripts/migrate.ts` etc., ver KI-010) → `pnpm db:test-rls` → e2e de cadastro/login → seed de vídeos nas lições
2. ~~Popular `content/videos.json`~~ **FEITO** (66/66 via `scripts/fill-videos.py` + oEmbed; trocas pontuais: `--only <slug>`)
3. ~~Integrar a agenda do planejador no painel~~ **FEITO** (card "Agenda de hoje")
4. ~~Deploy na Vercel → Lighthouse (meta ≥90)~~ **FEITO** (sessão 4b: desktop 100/100/96/100, mobile 93/100/96/100; falta só configurar Site URL no Supabase e testar push em aparelho real)
5. ~~Adicionar gitleaks ao CI~~ **FEITO** (job `gitleaks` no ci.yml; histórico verificado localmente: 0 leaks)
6. ~~Disparar 1 rodada do pipeline noturno e conferir as questões geradas~~ **FEITO** (sessão 4: 2/2 validadas via OpenRouter real)
7. Expansões da seção 19, na ordem

## Pendências do usuário (ver docs/KNOWN_ISSUES.md)

- ~~SENHA do banco Postgres~~ **RECEBIDA E VALIDADA** (2026-10-09, sessão 3 — banco 100% ativo)
- ~~URL do projeto Supabase + publishable key~~ **RECEBIDOS E VALIDADOS** (2026-10-09)
- ~~Token do GitHub~~ **RECEBIDO E USADO** (2026-10-09, sessão 4 — push + secrets concluídos)
- ~~Chave OpenRouter~~ **RECEBIDA E VALIDADA AO VIVO** (2026-10-09, sessão 4)
- **Conectar o repo na Vercel** + definir a variável `APP_URL` (Settings → Secrets and variables → Actions → Variables) com a URL de produção

## Erros conhecidos

Ver `docs/KNOWN_ISSUES.md`.

## Aceites verificados nesta sessão (3) — ativação do banco

- Conexão Postgres: **Session pooler `aws-1-us-west-2.pooler.supabase.com:5432`** (host direto é IPv6-only; região descoberta via ranges AWS + sonda). Senha com `:` percent-encodada (`%3A`) no `.env`
- **5 migrações aplicadas** (`_studymoon.migrations` rastreando), 25 tabelas + 31 políticas RLS ativas
- Seed: 5 áreas, 80 tópicos (66 folha + 14 disciplinas-raiz), 66 lições, 35 questões, 8 medalhas, 6 temas — **jsonb verificado como array (35/35, 80/80, 6/6)** após correção do bug de dupla codificação
- **RLS: 10/10 PASS** (isolamento A×B, gabarito protegido, currículo público, XP antifraude, anônimo bloqueado)
- **E2E no navegador com o banco real**: login → onboarding 4 passos → painel (perfil criado por trigger, agenda do planejador) → prática adaptativa → 2 acertos → feedback com MathML → **funil completo no banco** (attempts, xp_events +13 com anti-fraude bloqueando resposta 0,4s rápida demais, Elo 1200→1217, cartões FSRS estado learning com due futuro, streak 0 correto)
- Bugs corrigidos: (1) `lessons-areas.json` inparseável (quebra de linha crua + `\-` inválido) — reparado e 66 lições validadas no Zod; (2) `/perfil` crashando (`ProfileSettings.DeleteAccount` estático → export nomeado, RSC-safe); (3) dupla codificação jsonb no seed (`sql.json()`)
- `pnpm verify` verde (75/75), **build de produção verde** (12/12 páginas estáticas), dev server no ar
- Screenshots: `download/painel-e2e.png` (desktop) e `download/painel-e2e-mobile.png` (375px)
- Banco deixado limpo: usuários de teste removidos (auth.users=0), só conteúdo semeado

## Aceites verificados nesta sessão (4) — push, secrets e IA ao vivo

- **Push concluído**: `4aba9d6..473feaa` fast-forward (7 commits: planejador, vídeos, gitleaks, fixes de DB/perfil, docs, IA) → repo `Kronos1027/StudyMoon` atualizado
- **10 secrets sincronizados** via `scripts/set-github-secrets.ts` (Supabase URL/anon/secret, DATABASE_URL, GEMINI/GROQ/OPENROUTER, CRON_SECRET, VAPID par)
- **CI verde no 473feaa**: verify + gitleaks + E2E Playwright, todos success
- **OpenRouter validado ao vivo**: slug antigo `meta-llama/llama-3.3-70b-instruct:free` morreu; bench de 4 `:free` atuais elegeu **`nvidia/nemotron-3-super-120b-a12b:free`** (JSON válido, 5 alternativas, ~124ms)
- **Cascata real do roteador**: gemini (400 geo-block HK) → groq (403 geo) → **openrouter atende com JSON correto** (`{"capital": "Brasília"}`); na Vercel (saída EUA) o Gemini atende em 1º lugar
- **`gemini-3.8-flash` confirmado como modelo atual** via catálogo (a menção do usuário a "gemini-1.5-flash" é só a origem antiga da chave; 1.5 foi aposentado)
- **PIPELINE NOTURNO REAL**: `POST /api/cron/content?topics=1&perTopic=2` → **2 geradas, 2 validadas (4 camadas), 0 rejeitadas** — questões em `mt-operacoes-basicas` com contexto brasileiro real e matemática correta (173÷8 → resto 5, gabarito C)
- Ferramentas novas: `scripts/test-ai-providers.mjs` (sonda), `bench-openrouter.mjs` (comparador), `test-ai-router.ts` (cascata E2E), `inspect-ai-questions.ts` (auditoria do que a IA inseriu)

## Produção validada (sessão 4b)

- URL: **https://study-moon-eight.vercel.app** — splash, login, redirects e guard verificados no navegador (agent-browser), sem erros de console
- Variáveis `NEXT_PUBLIC_*` corrigidas no build (checado inline nos chunks do navegador) após o usuário reclassificar como Config mantendo o prefixo
- Cron: `GET /api/cron/keepalive` → 401 sem segredo / `{"ok":true}` com CRON_SECRET (prova também o SUPABASE_SECRET_KEY e o acesso ao banco)
- Round-trip de auth real: credenciais inválidas → mensagem amigável PT-BR vinda do GoTrue de verdade
- **Lighthouse ≥90 nos dois formatos**: desktop 100/100/96/100 (FCP 256ms, LCP 475ms, CLS 0.000) e mobile 93/100/96/100 — relatórios em `download/lighthouse-*.json`
- `APP_URL` configurada como Actions **variable** (não secret) → 4 workflows agendados desbloqueados

## Pendências da sessão 4 (todas exigem ação do usuário)

1. **Supabase Auth → URL Configuration**: Site URL `https://study-moon-eight.vercel.app` + Redirect URL `https://study-moon-eight.vercel.app/**` (links de confirmação de e-mail apontando pro deploy)
2. Teste de notificação push em aparelho real (Android + iPhone PWA) após o deploy
3. Expansões da seção 19 do documento mestre, na ordem

## Bugfix da demo desligada do assunto (sessão 5)

- **Bug**: "Veja o conceito em movimento" exibia simulador de outro assunto — questão de eutrofização (`cn-ecologia`) mostrava o **quadro de Punnett** (demo de nível de **área** chamada `biologia`, vinculada a 4 tópicos)
- **Correção estrutural**: demos agora são vinculadas a **tópico**, nunca a área. O `demo_id` exibido com uma questão vem do **join `topics(demo_id)`** em `practice`, `mock-exam` e `level-test` — estruturalmente impossível exibir demo de outro tópico. Tópico sem simulador → **nenhuma demo** (nada melhor que demo errada)
- Demo `biologia` extinta: quadro de Punnett renomeado para **`genetica`** (só `cn-genetica`); `cn-citologia` e `cn-fotossintese` ficam sem demo; `cn-ecologia` ganha o novo simulador
- **Novo simulador `eutrofizacao`**: slider de carga de esgoto → nutrientes entrando no lago (partículas animadas) → floração de algas → gráfico de oxigênio dissolvido com limiar crítico de 3 mg/L → mortandade de peixes (modelo determinístico calibrado: ≤50% o lago sobrevive, 60% mortandade em curso, 80%+ colapso; reduzir a carga recupera o lago)
- `registry.ts` ganha **`demoTopicBindings`** (demo → tópicos válidos, espelhando o curriculo)
- **Teste de regressão** `tests/unit/demo-topic-binding.test.ts` (9 casos): falha se qualquer questão exibir simulador de tópico diferente; trava curriculo ↔ registry ↔ seeds; pegou de bônus 1 seed divergente (chuveiro elétrico sem demo do tópico)
- `scripts/sync-demo-bindings.ts` + workflow manual `sync-demo-bindings.yml`: sincroniza `topics.demo_id` do curriculo e espelha `questions.demo_id` no banco (idempotente)
- `pnpm verify` verde: lint 0 errors, typecheck limpo, **84/84 testes**
