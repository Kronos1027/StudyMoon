# KNOWN_ISSUES.md — Problemas conhecidos

Itens ativos, impacto e solução de contorno. Atualizado a cada fase.

---

## KI-001 — Gemini e Groq bloqueiam o IP do ambiente de desenvolvimento
**Impacto:** não é possível chamar Gemini/Groq ao vivo a partir do ambiente de desenvolvimento (IP Hong Kong). Erros: `FAILED_PRECONDITION: User location is not supported` (Gemini) e `Forbidden` (Groq).
**Contorno:** provider `mock` nos testes; OpenRouter (quando a chave chegar) para validação ao vivo; na Vercel (região EUA/global) ambos funcionam.
**Status:** aguardando chave OpenRouter do usuário.

## KI-002 — Pendências do usuário
- URL do projeto Supabase (`https://xxxxx.supabase.co`)
- String de conexão do Postgres (migrations/seed/backup)
- Chave OpenRouter (opcional, para teste ao vivo da IA)
**Contorno:** migrations e clientes escritos e versionados; execução no banco real assim que as informações chegarem.

## KI-003 — Google OAuth exige configuração manual no Supabase
O login com Google precisa de credenciais OAuth do Google Cloud coladas no dashboard do Supabase (Authentication → Providers → Google). Passo a passo em `docs/SETUP.md`. Até lá, o botão aparece desabilitado com explicação.

## KI-004 — Vercel cron tem precisão de ±1h (plano Hobby)
Lembretes precisos (a cada 15 min) são disparados por GitHub Actions (`push-reminders.yml`) chamando a rota protegida `/api/cron/reminders`, não pelo cron da Vercel.
**Status:** fluxo implementado na Fase 8.
