# Auditoria Supabase — StudyMoon (2026-10-27)

Esta auditoria foi realizada **somente com leituras** no projeto Supabase `studymoon`. Nenhuma migração, política ou dado de aluno foi alterado.

## Estado do banco
- Projeto: **ativo e saudável**, PostgreSQL 17, região us-west-2.
- Tabelas do schema public: **25/25 com RLS ligado** (confirmado por SQL).
- Conteúdo atualmente registrado: 5 áreas, 80 tópicos, 66 aulas, 40 questões.
- Histórico: 27 tentativas, 25 registros de domínio, 9 cartões de repetição espaçada.
- O histórico proprietário **`_studymoon.migrations` confirmou que `0001` a `0006` já foram aplicadas** (em 9 de outubro de 2026). A API nativa de migrações do Supabase fica vazia porque este projeto usa o migrador `scripts/migrate.ts`. **Não rodar 0001–0006 novamente.**

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

## Etapa 2 — mudanças preparadas no PR (AINDA NÃO APLICADAS AO BANCO)

- `0007_security_and_indexes.sql`: `GRANT SELECT (subtopic, demo_params)` para consertar o carregamento autenticado de exercícios (confirmou-se no banco que essas colunas não estão no grant atual), sem expor `answer_key`, `explanation_md` ou `numeric_expr`; revogação de EXECUTE público dos dois SECURITY DEFINER de trigger; `search_path` fixado para três funções; oito índices para FKs.
- `0008_optimize_rls.sql`: 24 `ALTER POLICY` gerados das políticas REAIS via `pg_policies`, conservando nomes, funções e predicados de propriedade. Somente `auth.uid()` muda para `(select auth.uid())`.
- `scripts/test-rls.ts`: removido falso positivo que aceitava uma leitura indevida de `answer_key`; verificação adicional de `numeric_expr` e permissões dos simuladores; limpeza garantida das contas de teste mesmo quando falha.
- `tests/unit/migration-security.test.ts`: testes estáticos que protegem os grants, as funções de trigger e as 24 policies.
- `src/lib/essay/actions.ts` e `src/components/essay/essay-editor.tsx`: trava atômica contra múltiplas correções de uma mesma redação, evita salvamentos após envio, informa falhas ao usuário e corrige gráfico de nota zero.

**Não aplicar automaticamente em produção.** Fluxo recomendado:

1. Criar um ambiente de teste isolado, sem despesas adicionais sem consentimento.
2. Aplicar as migrações com `pnpm db:migrate` **somente** contra a URL de teste, depois de confirmar que o histórico de migrações tem `0001`–`0006`.
3. Rodar `pnpm verify:full` e `pnpm db:test-rls` usando exclusivamente URL, publishable/anon e secret key **do ambiente de teste**. Esse teste cria e apaga dois usuários temporários.
4. Exercitar os fluxos reais de cadastro → perfil → streak, questões → revisão, redação → autosave → correção, isolamento entre contas.
5. Executar os Advisors novamente e comparar com o baseline.
6. Só considerar produção com backup testado, janela de rollback e autorização específica. **Nenhuma dessas migrações foi aplicada via esta auditoria.**

**Limites dos testes atuais**: O CI público executa lint, TypeScript, unitários, compilação, Playwright smoke e gitleaks. Não possui credenciais para testes autenticados de Supabase; passar no CI **não** demonstra que `0007`/`0008` funcionam no banco. O script `db:test-rls` deve ser rodado em ambiente isolado antes da liberação.


## Etapa 3 — integração isolada automatizada (PostgreSQL 17)

A workflow `.github/workflows/postgres-integration.yml` sobe um PostgreSQL 17 **descartável** em GitHub Actions. O script `tests/database/postgres-integration.sh` recria os papéis essenciais (`anon`, `authenticated`, `service_role`), a função `auth.uid()` e a tabela mínima `auth.users` para testes. Executa as oito migrações SQL da aplicação, depois confirma com assertions PostgreSQL reais:

- Cadastro de dois estudantes acionando ambos os triggers (perfis e streaks).
- Leitura isolada de perfil, tentativas e redações sob o papel de cada estudante.
- Separação entre questão publicada e rascunho não publicado.
- Consulta autenticada a `questions.subtopic` e `questions.demo_params`, sem conceder gabarito, explicação nem `numeric_expr`.
- Bloqueio de escrita direta de XP/tentativas e chamada de funções de trigger privilegiadas.
- Visitante anônimo sem acesso a registros pessoais.
- Edição legítima do perfil do próprio estudante permanece funcional.

**Resultado inicial confirmado:** https://github.com/Kronos1027/StudyMoon/actions/runs/40605874962 — PostgreSQL migration + RLS integration: `success`.

**Limite metodológico:** o teste usa emulação mínima de Auth e não substitui o serviço Supabase hospedado, os claims reais JWT nem os testes completos do navegador autenticado. Nenhuma tabela de produção foi criada ou alterada. 

## Etapa 4 — integridade de redações

- Criação de redação deixou de acontecer durante a renderização de `GET /redacao/nova`: somente a ação explícita no seletor de modo cria um novo registro.
- Nova rota protegida `/redacao/[id]/editar` carrega o texto persistido e exige ser o proprietário de um rascunho.
- O histórico e o detalhe da redação permitem continuar a escrita.
- Salvamentos de uma mesma edição são serializados e usam debounce de 1,5 s, evitando que pedidos antigos sobrescrevam texto novo.
- A correção com IA continua sendo estimativa, nunca nota oficial do ENEM.

Os testes CI de lint, tipos, unidade, build e Playwright smoke devem passar no commit final do PR antes da revisão para merge.

## Etapa 5 — consistência transacional de XP (28/10)

### Problema corrigido no código em revisão

Antes, `submitAttempt` e `correctEssay` gravavam `xp_events` e atualizavam `profiles.xp` em chamadas **distintas**, calculando o novo saldo a partir do valor lido antes. Duas solicitações simultâneas podiam sobrescrever recompensas, e falhas de rede entre as chamadas podiam deixar o histórico e o perfil divergentes.

A migração `0009_atomic_xp_awards.sql` cria a função `public.award_study_xp`, com:

- `SECURITY INVOKER`, `search_path` fixo e **EXECUTE reservado ao papel `service_role`**; não se concede acesso ao visitante nem ao estudante autenticado.
- Bloqueio `SELECT ... FOR UPDATE` sobre o perfil do aluno, serializando todas as recompensas desse usuário.
- Verificação de duplicidade por `user_id`, `kind` e `ref_id` (incluindo redações); índice único parcial para redações.
- Cálculo de limite diário por tipo, usando corte de data em UTC, como no comportamento existente.
- Inserção do evento, atualização de XP, nível e título numa **mesma transação**.
- Proteção contra argumentos inválidos e quantidade excessiva de XP solicitada.

A action de questões e a de redações chamam a função com o cliente **servidor-only**, nunca pelo navegador. A falha de recompensa é registrada no servidor e não apaga uma resposta ou correção já persistida.

### Testes

- `tests/database/xp-awards.sql` verifica prêmio inicial, deduplicação, teto diário, teto independente por categoria, nível, perfil, ledger, argumentos inválidos e privilégio de execução.
- `tests/database/xp-concurrency.sh` inicia duas transações separadas no mesmo aluno. Uma bloqueia a linha com `FOR UPDATE`; a segunda aguarda e lê o saldo já atualizado, para detectar perda de atualizações e violação de teto.
- `tests/database/postgres-integration.sh` aplica **0001 a 0009** em um contêiner PostgreSQL 17 descartável e executa os testes existentes de RLS e os novos de XP.
- Os scripts têm proteção contra uso em host que não seja `localhost`/`127.0.0.1`. **Não executá-los contra banco de produção.**

### Cuidados antes de publicar

1. A aplicação nova **depende da migração 0009** para creditar XP. Garantir a aplicação validada de `0007`, `0008` e `0009` no banco de homologação antes de testar/implantar o novo código.
2. Fazer backup do banco de produção, verificar não existirem duplicatas históricas de XP de redação e ensaiar rollback. O índice único `uq_xp_essay_once` falhará com segurança se houver duplicatas antigas.
3. Não disponibilizar a função a `anon`/`authenticated`; manter a chave `service_role` estritamente no servidor.
4. Continuam pendentes uma homologação integrada com Supabase Auth real, validação completa do navegador autenticado e aprovação explícita antes de modificar produção.
