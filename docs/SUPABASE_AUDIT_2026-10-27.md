# Auditoria Supabase — StudyMoon (2026-10-27)

Esta auditoria foi realizada **somente com leituras** no projeto Supabase `studymoon`. Nenhuma migração, política ou dado de aluno foi alterado.

## Estado do banco
- Projeto: **ativo e saudável**, PostgreSQL 17, região us-west-2.
- Tabelas do schema public: **25/25 com RLS ligado** (confirmado por SQL).
- Conteúdo atualmente registrado: 5 áreas, 80 tópicos, 66 aulas, 40 questões.
- Histórico: 27 tentativas, 25 registros de domínio, 9 cartões de repetição espaçada.
- `supabase` API `list_migrations` retornou lista vazia — **não significa que os arquivos SQL do repositório não foram aplicados**, apenas que não há migrações listadas nessa API. Conferir esquema real versus `supabase/migrations/` antes de qualquer mudança.

## Alertas de segurança dos Advisors
1. **Funções trigger expostas a EXECUTE** (`public.handle_new_user` e `public.handle_new_profile`): ambas são SECURITY DEFINER, têm `search_path=public` e o privilégio de EXECUTE para `anon` e `authenticated`. Por serem funções com retorno `trigger`, uma execução direta via RPC normalmente falhará fora do contexto de trigger; mesmo assim o privilégio é desnecessário e deve ser revisado/revogado após teste em ambiente seguro. Não substituir por SECURITY INVOKER sem verificar a criação automática de perfis e streaks. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable .
2. **`public.set_updated_at()` sem search_path fixo**: funciona como trigger (não SECURITY DEFINER), mas deve receber um `SET search_path` explícito e referências qualificadas. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable .
3. **Proteção contra senhas vazadas desativada**: verificar disponibilidade da configuração em Auth antes de ativar. Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
4. **`ai_cache` e `content_jobs` sem políticas RLS**: ambos com RLS **ligado** e sem policies, coerente com acesso apenas server-side. Não criar policies públicas por reflexo. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy .

## Alertas de desempenho
- **24 políticas** com avaliação repetida de `auth.uid()` detectadas pelo Advisor. Em políticas adequadas, envolver em `(select auth.uid())` pode melhorar planos, mas preservar o comportamento de WITH CHECK/USING e testar por papéis antes de aplicar. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan .
- **8 chaves estrangeiras sem índice de cobertura**: `content_jobs.topic_id`, `essays.theme_id`, `mock_exam_items.question_id`, `question_reports.user_id`, `srs_cards.question_id`, `study_sessions.topic_id`, `topic_mastery.topic_id`, `user_badges.badge_id`. Priorizar tabelas que crescem, observando índices existentes e custo de escrita; criar índices com migração versionada e verificar planos. Referência: https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys .

## Plano de correções seguro
1. Criar ambiente de teste e registrar baseline SQL/policies/roles/triggers/índices.
2. Testar signup real e criação automática de profiles/streaks.
3. Ajustar privilégios EXECUTE e search_path com migração versionada, rodar testes de autenticação.
4. Otimizar índices/policies em migrações separadas, verificando RLS para acesso próprio e cruzado.
5. Rodar Advisors novamente e validar a aplicação web em preview.
6. Somente então considerar mudanças na produção.

> Não aplicar instruções de migração de maneira cega: a produção contém dados de alunos.
