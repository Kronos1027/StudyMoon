# PROGRESS.md — StudyMoon

Última atualização: 2026-10-09 (sessão 3 — **BANCO ATIVO**: migrações + seed + RLS 10/10 + E2E completo com dados reais; 2 bugs corrigidos)

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
| 9 — Robustez e entrega | 🔶 parcial | keepalive + backup semanal + offline + privacidade/LGPD + exportar/apagar + **gitleaks no CI (histórico limpo)** ok; **pende: Lighthouse pós-deploy, notificação em aparelho real** |

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
4. Deploy na Vercel → Lighthouse (meta ≥90) → notificação em aparelho real (Android + iPhone PWA) → configurar Site URL no Supabase (KI-011)
5. ~~Adicionar gitleaks ao CI~~ **FEITO** (job `gitleaks` no ci.yml; histórico verificado localmente: 0 leaks)
6. Disparar 1 rodada do pipeline noturno e conferir as questões geradas (exige banco provisionado)
7. Expansões da seção 19, na ordem

## Pendências do usuário (ver docs/KNOWN_ISSUES.md)

- **SENHA do banco Postgres** (único bloqueio do `pnpm setup`) — Project Settings → Database → Reset database password, ou colar a Connection string completa com a senha real (o dashboard sempre mostra `[YOUR-PASSWORD]` como placeholder)
- ~~URL do projeto Supabase + publishable key~~ **RECEBIDOS E VALIDADOS** (2026-10-09)
- Reenviar o token do GitHub quando quiser push das alterações da sessão 2 (o token da sessão 1 não fica salvo no ambiente)
- Chave OpenRouter (opcional, para teste ao vivo da IA no desenvolvimento)
- Conectar o repo na Vercel + definir a variável `APP_URL` (Settings → Secrets and variables → Actions → Variables) com a URL de produção

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

## Pendências da sessão 3

1. **Push para o GitHub**: o token foi perdido na compactação da sessão 2 — 5 commits locais aguardando (`dff0e83`..`c657eef`). Pedir o token de novo (fine-grained, Contents: Read and Write) OU o usuário conecta o repo manualmente
2. Atualizar secrets do GitHub (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SECRET_KEY, DATABASE_URL) via `scripts/set-github-secrets.ts` — exige o token acima
3. Vercel: conectar repo → env vars → deploy → Site URL no Supabase (Auth) → Lighthouse ≥ 90 → PWA push em aparelho real
4. Repo variable `APP_URL` para os 4 workflows agendados
