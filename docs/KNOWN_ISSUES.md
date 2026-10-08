# KNOWN_ISSUES.md — Problemas conhecidos

Itens ativos, impacto e solução de contorno. Atualizado em 2026-10-09.

---

## KI-001 — Gemini e Groq bloqueiam o IP do ambiente de desenvolvimento
**Impacto:** não é possível chamar Gemini/Groq ao vivo a partir do ambiente de desenvolvimento (IP Hong Kong). Erros: `FAILED_PRECONDITION: User location is not supported` (Gemini) e `Forbidden` (Groq). As chaves são válidas e funcionarão na infraestrutura da Vercel (região global/EUA).
**Contorno:** provider `mock` nos testes unitários; pipeline testado com validação determinística. Validação ao vivo acontece após o deploy.
**Status:** resolvido por design (fallback em cascata); teste ao vivo pendente de deploy.

## KI-002 — Banco real ainda não provisionado (aguardando o usuário)
**Impacto:** o app roda em modo "configuração pendente" (banner honesto nas telas de login); as migrations não foram aplicadas; nenhuma conta existe.
**Contorno:** todo o fluxo foi construído e o script `pnpm setup` faz tudo em um comando quando `DATABASE_URL` chegar.
**O que falta do usuário:** (1) `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable); (2) `DATABASE_URL` (Connection string/URI).

## KI-003 — Google OAuth exige configuração manual no Supabase
O login com Google precisa de credenciais OAuth do Google Cloud coladas no dashboard do Supabase (Authentication → Providers → Google). Passo a passo no `docs/SETUP.md` § 2.4. Até lá, o botão aparece desabilitado com explicação (comportamento intencional).

## KI-004 — Vídeos das lições ainda não populados
O mecanismo existe (`content/videos.json` + `pnpm check-videos` via oEmbed), mas a lista começa vazia por decisão de integridade: **nunca inventar ID de vídeo**. Sessão 2: buscar vídeos reais de canais educacionais brasileiros e validar cada um antes de listar.

## KI-005 — Planejador: agenda diária ainda não aparece no painel
O algoritmo (`generatePlan`) está implementado e coberto por testes (perfis forte/fraco geram planos distintos), mas o card "Agenda" do painel ainda não consome esses blocos. Próxima sessão.

## KI-006 — Workflows dependem da variável APP_URL
`push-reminders.yml`, `content-nightly.yml` e `keepalive.yml` chamam `${{ vars.APP_URL }}/api/cron/...`. Após o deploy na Vercel, definir **APP_URL** (Repository → Settings → Secrets and variables → Actions → *Variables*) com a URL de produção. Sem isso, os jobs falham silenciosamente (sem segredo em jogo).

## KI-007 — Notificação em aparelho real pendente
O fluxo push (VAPID + service worker + escalada gentil) está implementado; a validação em hardware real (Android + iPhone com PWA instalado) só é possível após o deploy — exigência do aceite da Fase 8.

## KI-008 — Pontuações de simulado são estimativas simples
O relatório usa percentual × 1000 (rotulado como estimativa, não TRI). Uma modelagem TRI-like é melhoria futura; o rótulo honesto já está em todas as telas.

## KI-009 — e2e do Playwright no CI ainda é smoke
O CI roda o smoke (renderização + manifest). O fluxo completo (cadastro → … → redação) exige as variáveis do Supabase como secrets do CI — adicionar na sessão 2 junto com o provisionamento.
