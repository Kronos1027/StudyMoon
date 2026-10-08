# ARCHITECTURE.md — Visão arquitetural do StudyMoon

## Princípio central

A IA é cara e limitada: **gere uma vez, valide, guarde e reaproveite para todos**. Chamadas em tempo real só para correção de redação, dúvida pontual e variação sob demanda. Todo o resto (questões, lições, temas de redação) é gerado em lote por um pipeline noturno, validado em camadas e versionado no banco.

## Camadas

```
┌─────────────────────────────────────────────────────────────┐
│ Next.js App Router (React 19, TS estrito)                   │
│  src/app        rotas: splash → login → onboarding → app    │
│  middleware     refresh de sessão Supabase (cookie)         │
├─────────────────────────────────────────────────────────────┤
│ Domínio (src/lib)                                           │
│  elo/       domínio por tópico (Elo adaptado + confiança)   │
│  srs/       repetição espaçada (FSRS via ts-fsrs)           │
│  planner/   geração e recálculo do plano de estudo          │
│  content/   validação de questões (formato, QA, mathjs)     │
│  push/      Web Push (VAPID, web-push) + escalada gentil    │
├─────────────────────────────────────────────────────────────┤
│ IA (src/lib/ai)                                             │
│  providers/ Gemini, Groq, Cerebras, OpenRouter, Mock        │
│  router     fallback, timeout, retry c/ backoff, circuito   │
│  prompts/   versionados, saída sempre JSON validada (Zod)   │
│  cache      tabela ai_cache (hash → resposta, com validade) │
├─────────────────────────────────────────────────────────────┤
│ Dados (Supabase)                                            │
│  Postgres + RLS em TODAS as tabelas                         │
│  Auth (e-mail/senha, Google) via @supabase/ssr              │
│  Escrita de conteúdo: apenas service role (server-side)     │
└─────────────────────────────────────────────────────────────┘
```

## Fluxos-chave

1. **Sessão:** middleware do Next.js (`src/middleware.ts`) repassa cookies do Supabase e mantém a sessão viva; rotas protegidas redirecionam para `/login`.
2. **Prática adaptativa:** o cliente pede a próxima questão a uma Server Action → `selectNextQuestion()` combina Elo (desafio 60–80% de acerto), tópicos fracos (20%) e intercalação (10%), excluindo questões vistas nos últimos 7 dias.
3. **Revisão:** cada tentativa cria/atualiza cartão FSRS; a fila diária lê os cartões que vencem no dia.
4. **Pipeline noturno (GitHub Actions → /api/cron/content):** lê a fila `content_jobs`, gera lotes de questões, valida em 4 camadas (formato → 2º modelo resolve às cegas → verificação numérica com mathjs → filtro de qualidade), publica só o que passa.
5. **Notificações:** GitHub Actions a cada 15 min chama `/api/cron/reminders` (protegida por `CRON_SECRET`); a rota calcula quem deve receber lembrete no fuso do aluno e envia via Web Push.

## Segurança

- RLS em todas as tabelas; aluno só lê/escreve as próprias linhas
- Zod em toda fronteira (entrada de API e saída de IA)
- `SUPABASE_SECRET_KEY` e chaves de IA só no servidor
- Rate limit por IP/usuário nas rotas de IA
- Texto do aluno tratado como DADO nos prompts (anti prompt injection)

## Decisões

Ver `docs/DECISIONS.md` para o registro completo com contexto.
