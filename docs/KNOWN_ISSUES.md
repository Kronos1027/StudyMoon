# KNOWN_ISSUES.md — Problemas conhecidos

Itens ativos, impacto e solução de contorno. Atualizado em 2026-10-09.

---

## KI-001 — Gemini e Groq bloqueiam o IP do ambiente de desenvolvimento
**Impacto:** não é possível chamar Gemini/Groq ao vivo a partir do ambiente de desenvolvimento (IP Hong Kong). Erros: `FAILED_PRECONDITION: User location is not supported` (Gemini) e `Forbidden` (Groq). As chaves são válidas e funcionarão na infraestrutura da Vercel (região global/EUA).
**Contorno:** provider `mock` nos testes unitários; pipeline testado com validação determinística. Validação ao vivo acontece após o deploy.
**Status:** resolvido por design (fallback em cascata); teste ao vivo pendente de deploy.

## KI-002 — Banco real ainda não provisionado (aguardando a SENHA do banco)
**Impacto:** `NEXT_PUBLIC_SUPABASE_URL` e a publishable key já estão configurados e validados (auth ao vivo testada: cadastro, login inválido, admin API). Falta apenas a **senha real** do Postgres — o dashboard sempre exibe `[YOUR-PASSWORD]` como placeholder na Connection string, nunca a senha em si.
**Contorno:** quando a senha chegar, atualizar `DATABASE_URL` no `.env` e rodar `pnpm setup`. **Importante:** o host direto `db.<ref>.supabase.co` resolve apenas IPv6; em ambientes sem saída IPv6 usar o **Session Pooler** (`aws-0-<região>.pooler.supabase.com:5432`, usuário `postgres.<ref>`), que tem IPv4.
**O que falta do usuário:** a senha do banco (Project Settings → Database → Reset database password, ou colar a string completa com a senha real).

## KI-003 — Google OAuth exige configuração manual no Supabase
O login com Google precisa de credenciais OAuth do Google Cloud coladas no dashboard do Supabase (Authentication → Providers → Google). Passo a passo no `docs/SETUP.md` § 2.4. Até lá, o botão aparece desabilitado com explicação (comportamento intencional).

## KI-004 — Vídeos das lições: RESOLVIDO (66/66 tópicos)
Populado na sessão 2 com `scripts/fill-videos.py`: busca no YouTube por tópicos com canais reconhecidos (Ferretto, Dicasdemat, Noslen, Biologia com Samuel, Gabriel Cabral, Descomplica etc.), filtro de relevância por palavra-chave + validação **oEmbed obrigatória** de cada ID (`pnpm check-videos`: 66 verificados, 0 removidos). Reexecutar `python3 scripts/fill-videos.py --only <slug>` para trocar o vídeo de um tópico específico.

## KI-005 — Planejador no painel: RESOLVIDO (sessão 2)
O card "Agenda de hoje" no `/painel` consome `generatePlan` com dados reais (domínio por tópico, fila FSRS de 7 dias, data da prova, horas diárias), com deep-links por bloco (revisão, aula nova, prática, simulado de domingo, redação de sábado) e estados vazios honestos (sem data da prova → CTA para o perfil).

## KI-006 — Workflows dependem da variável APP_URL
`push-reminders.yml`, `content-nightly.yml` e `keepalive.yml` chamam `${{ vars.APP_URL }}/api/cron/...`. Após o deploy na Vercel, definir **APP_URL** (Repository → Settings → Secrets and variables → Actions → *Variables*) com a URL de produção. Sem isso, os jobs falham silenciosamente (sem segredo em jogo).

## KI-007 — Notificação em aparelho real pendente
O fluxo push (VAPID + service worker + escalada gentil) está implementado; a validação em hardware real (Android + iPhone com PWA instalado) só é possível após o deploy — exigência do aceite da Fase 8.

## KI-008 — Pontuações de simulado são estimativas simples
O relatório usa percentual × 1000 (rotulado como estimativa, não TRI). Uma modelagem TRI-like é melhoria futura; o rótulo honesto já está em todas as telas.

## KI-009 — e2e do Playwright no CI: RESOLVIDO PARCIALMENTE (auditoria de demos)
O CI continua rodando o smoke + agora os 25 testes da galeria /demos (regressões de subtópico, snapshots visuais e 360 px sem rolagem lateral). O fluxo completo autenticado (cadastro → … → redação) continua dependendo das variáveis do Supabase como secrets do CI.

## KI-010 — tsx/esbuild quebra no sandbox de desenvolvimento (EPIPE)
**Impacto:** `npx tsx` (usado por `pnpm setup`, `pnpm check-videos`, `pnpm content:validate`) falha no sandbox com `The service was stopped: write EPIPE` (esbuild 0.28 × Node 24.21 do ambiente). Não afeta o CI (GitHub runners executam tsx normalmente).
**Contorno no sandbox:** `node --experimental-strip-types scripts/<script>.ts` executa os mesmos scripts com o Node 24 nativo (validado com `check-videos.ts`).

## KI-011 — SMTP da Supabase tem limite de 2 e-mails/hora
O cadastro com confirmação por e-mail está ATIVO no projeto (padrão Supabase). O SMTP embutido (gratuito) limita ~2 e-mails/hora e os links de confirmação apontam para a Site URL configurada no dashboard. **Após o deploy:** (1) definir Site URL em Authentication → URL Configuration com a URL de produção; (2) para uso real, configurar SMTP próprio (ex.: Resend) ou desligar "Confirm email" em Authentication → Providers → Email.
**Status:** espera configuração pós-deploy; cadastro/login por senha testados ao vivo e funcionando.

## KI-012 — Aviso do React 19.2+ sobre script do next-themes (só dev)
O React 19.2 introduziu o aviso `Encountered a script tag while rendering React component` disparado pelo script anti-flash de tema que o next-themes (0.4.6) renderiza dentro do provider. É **benigno**: o script executa no HTML gerado pelo SSR (que é o único momento em que ele importa — evita o flash de tema errado); no cliente ele nunca precisou executar. Não aparece no build de produção. Monitorar atualização do next-themes que adote o padrão `<template>` recomendado pelo React.
**Status:** aceito (dev-only); tema claro/escuro verificado funcionando em desktop e 375px.

## KI-013 — postgres.js re-serializa parâmetros com cast `::jsonb`
O driver postgres.js aplica `JSON.stringify` próprio em valores de parâmetros seguidos de cast `::jsonb` — passar `JSON.stringify(x)` nesses pontos produz **dupla codificação** (jsonb escalar string contendo o JSON, quebrando `Array.isArray` no cliente). Corrigido no `seed.ts` migrando para `sql.json(x)` (forma canônica, codificação única). Regra para o futuro: **nunca** combinar `JSON.stringify` com `::jsonb` em queries com postgres.js; usar `sql.json()`.
**Status:** corrigido (commit "fix(db): repair lessons JSON + seed jsonb double-encoding"); dados do banco re-semeados e verificados (35/35 alternativas como array).
