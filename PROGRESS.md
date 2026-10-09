# PROGRESS.md — StudyMoon

Última atualização: 2026-10-09 (sessão 2 — credenciais Supabase aplicadas, planejador no painel, 66 vídeos validados)

Se o contexto for reiniciado: leia este arquivo + `docs/DECISIONS.md` + `docs/KNOWN_ISSUES.md` e retome de onde parou.

## Fases

| Fase | Status | Notas |
| --- | --- | --- |
| 0 — Fundação | ✅ concluída | repo público, TS estrito, tokens, CI verde, PWA base, docs |
| 1 — Dados e login | ✅ código · 🔶 falta a SENHA do banco | 26 tabelas + RLS + grants prontas; URL + publishable key **configuradas e validadas ao vivo** (cadastro, login, admin API, redirects). `pnpm setup` pronto assim que a senha real do Postgres chegar (KI-002) |
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
