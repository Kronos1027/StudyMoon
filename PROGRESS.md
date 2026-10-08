# PROGRESS.md — StudyMoon

Última atualização: 2026-10-09 (Fase 0 em andamento)

Se o contexto for reiniciado: leia este arquivo + `docs/DECISIONS.md` + `docs/KNOWN_ISSUES.md` e retome da fase marcada como "em andamento".

## Fases

| Fase | Status | Notas |
| --- | --- | --- |
| 0 — Fundação | ✅ concluída | repo, TS estrito, tokens, CI, docs, PWA base |
| 1 — Dados e login | ⏳ em andamento | migrations + RLS + auth + onboarding |
| 2 — Identidade visual e painel | ⬜ pendente | |
| 3 — Currículo e aulas | ⬜ pendente | |
| 4 — Prática, domínio e revisão | ⬜ pendente | |
| 5 — Teste de nível e planejador | ⬜ pendente | |
| 6 — IA e motor de conteúdo | ⬜ pendente | |
| 7 — Redação e simulados | ⬜ pendente | |
| 8 — Cuidado e engajamento | ⬜ pendente | |
| 9 — Robustez e entrega | ⬜ pendente | |

## Próximos passos (Fase 1)

1. Migrações SQL completas com RLS em todas as tabelas
2. Clientes Supabase (browser/server) + middleware de sessão
3. Telas de login/cadastro/recuperação + onboarding
4. Script de teste de RLS (acesso entre usuários deve falhar)
5. Seed inicial

## Erros conhecidos / bloqueios

- Aguardando do usuário: URL do projeto Supabase, string de conexão do Postgres e chave OpenRouter (ver docs/KNOWN_ISSUES.md)
- Gemini e Groq bloqueiam chamadas do IP do ambiente de desenvolvimento (Hong Kong); funcionam na Vercel. Testes locais usam provider mock.

## Decisões recentes

Ver `docs/DECISIONS.md`.
