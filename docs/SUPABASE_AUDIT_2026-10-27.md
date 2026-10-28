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

## Etapa 6 — limite diário transacional do tutor e revisão elegível (28/10)

### Tutor

A implementação anterior do endpoint `/api/tutor` contava as linhas em `ai_cache` e só registrava o uso **depois** do retorno da IA. Duas requisições simultâneas podiam ultrapassar as 20 perguntas/dia porque ambas enxergavam a mesma contagem anterior.

- A migração `0010_tutor_daily_quota.sql` cria `public.tutor_daily_usage`, uma tabela com **RLS ativado e sem grants aos papéis anon/authenticated**, e duas funções **SECURITY INVOKER** exclusivas do service role: `claim_tutor_daily_turn` e `release_tutor_daily_turn`.
- A reserva do contador usa `INSERT ... ON CONFLICT ... DO UPDATE WHERE used < limit`, cuja disputa pela mesma linha é serializada pelo PostgreSQL. O dia é calculado em **UTC**, explicitamente.
- O endpoint verifica a existência da questão validada, reserva **antes** de chamar o provedor e responde com `429` quando o limite é atingido. Se o provedor falha ou devolve JSON inválido, tenta devolver a reserva. Em caso de erro no banco, retorna 503 sem consumir IA (fail closed).
- O log em `ai_cache` passa a ser apenas histórico auxiliar; não é mais a fonte de verdade da cota.
- **Limitação operacional:** se a função for interrompida abruptamente, a reserva pode permanecer contada até o próximo dia; isso evita ultrapassar a cota, mas pode negar temporariamente uma pergunta. Avaliar um mecanismo de reserva com TTL se a plataforma crescer.

### Segurança das revisões

- `submitAttempt(mode="review")` agora consulta o cartão `srs_cards` do usuário e rejeita a solicitação quando não existe, tem data inválida ou ainda **não venceu**. Isso impede ganhar XP de revisão apenas manipulando o argumento da ação do servidor.
- Testes unitários cobrem cartões vencidos, futuros, ausentes e inválidos.
- **Limitação ainda aberta:** duas respostas simultâneas a um mesmo cartão podem observar o cartão como vencido antes da primeira atualização. Há deduplicação do XP por cartão, mas uma futura transação conjunta de tentativas/Elo/FSRS é recomendada para consistência perfeita de toda a sessão.

### Testes do banco isolado

- `tests/database/tutor-quota.sql`: limite, liberação por falha, isolamento de usuários, RLS/grants, função não exposta e argumentos inválidos.
- `tests/database/tutor-concurrency.sh`: duas conexões disputam uma vaga; **exatamente uma** deve conseguir reservá-la.
- `tests/database/postgres-integration.sh`: executa as migrações **0001 a 0010**, segurança RLS, premiação transacional de XP e testes de cota.
- As novas funções não foram instaladas no Supabase de produção. **A publicação do código depende de aplicar as migrações 0007–0010 no ambiente de homologação e validá-las antes de qualquer implantação.**

## Etapa 7 — respostas com tempo medido no servidor e correção de FSRS (28/10)

### Problema 1: `timeMs` vinha do navegador

O servidor recebia `timeMs` como argumento da ação de resposta e usava esse valor para avaliação de FSRS e concessão de XP. Portanto, um cliente modificado poderia enviar um tempo artificialmente alto e contornar as regras de engajamento.

**Mitigação em `0011_practice_ticket_integrity.sql`**:

- Cria `practice_question_serves` com RLS ativo e acesso exclusivo de `service_role`.
- `getNextQuestion` só entrega uma questão depois de criar um ticket de exibição usando `issue_practice_question` no servidor.
- `submitAttempt` passa a chamar `record_practice_attempt`; dentro de uma **única transação do banco** são verificados o ticket do estudante, a publicação da questão, a elegibilidade de revisão e a resposta correta. A tentativa é inserida com o **tempo medido pelo relógio do PostgreSQL**, e o ticket é consumido uma única vez.
- Tickets com mais de quatro horas não são aceitos. O antigo campo `timeMs` permanece temporariamente no contrato da action por compatibilidade de UI, mas não influencia mais o XP nem os cartões FSRS.
- Novo fluxo de recuperação na interface quando o ticket foi consumido ou expirou: botão `Carregar outra questão`.
- **Limite de segurança:** a emissão de um novo ticket ainda é possível via ação autenticada de exibição; sistemas antifraude mais fortes exigiriam sessões de prova protegidas, rate limit adicional e desafios de autoria. A gravação de tentativas é atômica, mas os efeitos posteriores em domínio/Elo, cartões FSRS e metas diárias **ainda não estão na mesma transação**.

### Problema 2: gatilho defeituoso em `srs_cards` (verificado no Supabase real)

- A migração `0002_functions_triggers.sql` instalava `trg_srs_cards_updated_at` em `srs_cards`, mas o schema da tabela possui `last_update` e **não** `updated_at`.
- Confirmado por consulta **somente de leitura** ao projeto real: a trigger existe e a coluna referida não existe. Um UPDATE da tabela pode falhar com `record new has no field updated_at`, impedindo reprogramações FSRS.
- A migração `0012_fix_srs_update_trigger.sql` remove **somente** esse gatilho inválido, mantendo os demais gatilhos válidos. A própria rotina FSRS atualiza `last_update` explicitamente.
- `tests/database/srs-rescheduling.sql` faz um UPDATE real na data, número de revisões e `last_update`, depois verifica a persistência. Assim, o problema passa a ser capturado automaticamente no CI.
- `tests/database/practice-ticket.sql` testa submissão sem ticket, resposta duplicada, validação por data de revisão e tempo real do banco.
- `tests/database/practice-concurrency.sh` submete a mesma resposta em conexões paralelas: exatamente uma gravação deve ser aceita.

### Ordem obrigatória de homologação e publicação

1. Usar banco Supabase de homologação separado (sem custo adicional não autorizado). Fazer backup antes de qualquer operação no projeto real.
2. Aplicar, na ordem, **0007, 0008, 0009, 0010, 0011 e 0012** usando o migrador próprio do StudyMoon. Não pular a migração de correção do gatilho FSRS.
3. Confirmar segurança RLS e privilégios da service role, cadastro de usuários, questões, revisão, pontuação, tutor e redações com autenticação real.
4. **A versão nova do código depende das migrações até 0012**. Não mesclar/deployar ações novas antes de instalar o esquema correspondente.
5. Só considerar produção após aprovação explícita, janela de rollback e backup testado.

**Todas as alterações acima estão apenas no Pull Request de revisão; nenhuma migração 0007–0012 foi executada no Supabase de produção.**
