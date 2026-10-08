# PROGRESS.md — StudyMoon

Última atualização: 2026-10-09 (sessão 1 — fases 0 a 8 construídas)

Se o contexto for reiniciado: leia este arquivo + `docs/DECISIONS.md` + `docs/KNOWN_ISSUES.md` e retome de onde parou.

## Fases

| Fase | Status | Notas |
| --- | --- | --- |
| 0 — Fundação | ✅ concluída | repo público, TS estrito, tokens, CI verde, PWA base, docs |
| 1 — Dados e login | ✅ código completo · ⏳ execução | 26 tabelas + RLS + grants prontas; auth email/Google + onboarding ok. **Executar `pnpm setup` quando DATABASE_URL chegar** |
| 2 — Identidade visual e painel | ✅ concluída | splash canvas, shell, painel completo com dados reais, tema claro/escuro |
| 3 — Currículo e aulas | ✅ concluída | 5 áreas/ 21 disciplinas/ 56 tópicos (matriz INEP), 56 lições, 14 simuladores interativos. **Vídeos: popular via web-search + oEmbed (ver abaixo)** |
| 4 — Prática, domínio e revisão | ✅ concluída | 35 questões seed validadas (Zod + mathjs), seleção 70/20/10, Elo, FSRS, dicas em camadas, feedback animado, fila de revisão |
| 5 — Teste de nível e planejador | ✅ teste de nível · 🔶 planejador parcial | algoritmo do planejador implementado e testado (67 testes); **falta a agenda diária no painel** (integrar `generatePlan` no card "Agenda") |
| 6 — IA e motor de conteúdo | ✅ concluída | roteador com fallback + circuit breaker (8 testes), cache, tutor socrático com rate limit, pipeline noturno com validação em 4 camadas |
| 7 — Redação e simulados | ✅ concluída | 6 temas originais, editor com timer 30min/ modo prova, correção pela rubrica (5×200, degraus de 40), simulados parcial/dia1/dia2 com relatório |
| 8 — Cuidado e engajamento | ✅ concluída | push VAPID + escalada gentil (máx 2/dia, silêncio 22h-7h), XP antifraude, ligas, 8 medalhas, workflows Actions |
| 9 — Robustez e entrega | 🔶 parcial | keepalive + backup semanal + offline + privacidade/LGPD + exportar/apagar ok; **pende: gitleaks no CI, Lighthouse pós-deploy, notificação em aparelho real** |

## Aceites verificados nesta sessão

- `pnpm verify` (lint + typecheck + testes): **verde, 75/75 testes**
- Splash, login, redirects, offline: **verificados no navegador**
- Fallback de provedores de IA: **testado em unidade (429, 5xx, retry, circuito)**
- Validação determinística de conteúdo: **35/35 questões passando**
- Perfis fraco/forte geram planos diferentes: **testado em unidade**

## Próximos passos (sessão 2)

1. **Executar no banco real** (assim que o usuário mandar URL + DATABASE_URL): `pnpm setup` → `pnpm db:test-rls` → testar cadastro/login de ponta a ponta
2. Popular `content/videos.json` com vídeos reais (web-search → `pnpm check-videos` via oEmbed) — nunca inventar IDs
3. Integrar a agenda do planejador no painel (usar `generatePlan` com dados reais de domínio)
4. Deploy na Vercel → rodar Lighthouse (meta ≥90) → testar notificação em aparelho real (Android + iPhone com PWA instalado)
5. Adicionar gitleaks ao CI (`pnpm dlx gitleaks detect`)
6. Disparar 1 rodada do pipeline noturno e conferir as questões geradas
7. Expansões da seção 19, na ordem

## Pendências do usuário (ver docs/KNOWN_ISSUES.md)

- URL do projeto Supabase (`NEXT_PUBLIC_SUPABASE_URL`) + publishable key
- String de conexão do Postgres (`DATABASE_URL`)
- Chave OpenRouter (opcional, para teste ao vivo da IA no desenvolvimento)
- Conectar o repo na Vercel + definir a variável `APP_URL` (Settings → Secrets and variables → Actions → Variables) com a URL de produção

## Erros conhecidos

Ver `docs/KNOWN_ISSUES.md`.
