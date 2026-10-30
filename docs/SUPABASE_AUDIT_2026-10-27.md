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

## Etapa 8 — metas diárias transacionais (28/10)

### Problema corrigido no PR

O fluxo anterior de `submitAttempt` lia `daily_goals.done_questions` e depois fazia `UPDATE` com o valor incrementado, ou tentava um `INSERT` para o primeiro registro do dia. Duas respostas quase simultâneas do mesmo aluno podiam sobrescrever o contador uma da outra. Além disso, um erro na atualização da meta era ignorado mesmo depois da tentativa ser persistida.

### Migração `0013_atomic_daily_goals.sql`

- Instala `trg_attempt_daily_goal` em `public.attempts`, executado `AFTER INSERT` **na mesma transação da tentativa**.
- A função `public.track_daily_goal_from_attempt()` é `SECURITY INVOKER`, com `search_path` fechado, e revoga `EXECUTE` público explícito.
- `INSERT ... ON CONFLICT (user_id, date) DO UPDATE` incrementa `done_questions` do valor atual sob bloqueio de linha, sem perda de incrementos; preserva os alvos personalizados `target_questions` e `target_minutes`.
- Restringe a contabilização aos modos `practice`, `review`, `lesson_test`, preservando a semântica anterior, sem contar `mock_exam` indevidamente.
- A data continua em UTC, como o `todayKey()` do aplicativo. O tempo-meta inicial é derivado do campo `profiles.daily_hours`.
- Remove o código redundante de leitura/alteração da meta em `src/lib/practice/actions.ts`, evitando contagem dupla.

### Testes de regressão

- `tests/database/daily-goals.sql`: registra respostas de dois estudantes, verifica que alterações personalizadas na meta permanecem e que status muda para `done` no alvo; descarta as mudanças ao fim da transação.
- `tests/database/daily-goals-concurrency.sh`: cria aluno temporário **no PostgreSQL descartável**, grava duas tentativas paralelas, confere contagem exata de 2 e conclusão ao atingir 3; elimina o aluno temporário ao final.
- `tests/database/postgres-integration.sh`: aplica as migrações até **0013** e roda esses testes junto a RLS, FSRS, tutor e concorrência de XP.

### Limites restantes

O progresso da meta está transacional com a **inserção da tentativa**, mas a pontuação Elo, o reagendamento FSRS e o estado das sequências diárias ainda são atualizados em outras chamadas. Essas etapas exigem uma refatoração transacional separada com validação de regras e concorrência. A migração 0013 **não foi aplicada à produção**. A nova versão do código exige as migrações **0007–0013** antes de qualquer implantação; homologação com Supabase Auth real, backup e aprovação explícita continuam obrigatórios.

## Etapa 9 — domínio Elo transacional (29/10)

### Falha de concorrência corrigida no PR

Antes, `submitAttempt` realizava `SELECT` em `topic_mastery`, calculava Elo em JS e depois fazia um `UPSERT` do registro inteiro. Duas respostas simultâneas no mesmo tópico podiam gravar o **mesmo contador de tentativas** e sobrescrever uma atualização de Elo/confiança.

A migração `0014_atomic_topic_mastery.sql` cria o gatilho `trg_attempt_mastery` em `public.attempts`. Ele executa `ON CONFLICT DO UPDATE` sobre a linha **(estudante, tópico)**, sob bloqueio do próprio PostgreSQL, na mesma transação da resposta. A fórmula reproduz os fatores K 48/32/24/16 e a atualização da confiança do módulo TypeScript original, mantendo os limites Elo entre 400 e 2600.

- Apenas os modos `practice`, `review` e `lesson_test` entram no domínio automático; tentativas de simulados têm fluxo separado.
- A função de cálculo `next_study_elo` não é executável por `anon` ou `authenticated`; somente `service_role` tem EXECUTE para permitir o gatilho `SECURITY INVOKER`.
- A action passa a **apenas ler** o valor já persistido para exibir a porcentagem. Não executa mais atualizações concorrentes no registro de domínio.
- `tests/database/topic-mastery.sql` verifica Elo inicial, acertos/erros, fatores K, confiança, isolamento por estudante e atualização após a segunda resposta.
- `tests/database/mastery-concurrency.sh` responde a **duas questões diferentes do mesmo tópico simultaneamente** e exige a soma correta de duas atualizações do domínio, sem perda de contagem.

A primeira rodada de integração encontrou ausência do grant interno `service_role` para o helper; isso foi corrigido na migração e o teste PostgreSQL do commit revisado passou. O resultado anterior é preservado como regressão de configuração de papéis.

**Limites:** O reagendamento FSRS, atualização de dificuldade da questão e sequência de estudos ainda não estão totalmente transacionais com o cadastro da tentativa. Eles precisam de análise própria para não introduzir inconsistências nem alterar a matemática FSRS. A migração `0014` **não foi aplicada à produção**. O novo código exige **0007–0014**, em ordem, no ambiente de homologação; backup, testes reais de Supabase Auth e aprovação para produção continuam obrigatórios.

## Etapa 10 — persistência FSRS por revisão otimista (29/10)

### Falha abordada

Até a revisão anterior, `submitAttempt` buscava `srs_cards`, agendava um intervalo com a biblioteca TypeScript `ts-fsrs` e executava um `UPSERT` independente, **sem verificar erro da gravação**. Duas requisições com estado desatualizado podiam sobrescrever a data, a estabilidade e as repetições do cartão. Um erro de persistência podia ser ignorado e o aluno receber uma confirmação enganosa.

### Migração `0015_srs_revision_guard.sql`

- Acrescenta `srs_cards.revision BIGINT NOT NULL DEFAULT 0`, preservando todos os cartões já existentes.
- Cria `commit_srs_schedule`, função `SECURITY INVOKER` com `search_path` fechado e `EXECUTE` permitido **somente** à `service_role`.
- Novo cartão começa com versão 1. Atualização existente só funciona quando a versão lida continua igual à gravada no banco, a contagem FSRS de revisões avança exatamente um passo e `last_update` não retrocede.
- Um conflito retorna `false`, sem sobrescrever os dados. O servidor relê o cartão e recalcula o agendamento com `ts-fsrs`, por até quatro tentativas. Assim não duplicamos o cálculo FSRS em SQL.
- Se o agendamento não puder ser salvo, a interface avisa expressamente o estudante. A resposta da questão e o XP já registrados não são descartados.
- `tests/database/srs-revision.sql` cobre primeira inserção, duas revisões consecutivas, gravação antiga, repetição duplicada, datas inválidas e permissões.
- `tests/database/srs-concurrency.sh` corre duas transações contra a mesma versão: **exatamente uma** deve gravar e a outra detectar conflito. O GitHub Actions executa esses testes em um PostgreSQL descartável.

### Limite importante

Isso garante que um **UPSERT de FSRS não apague o estado mais recente**. Contudo, o agendamento ainda é uma chamada *posterior* à tentativa já gravada; uma falha permanente pode deixar uma resposta sem agendamento. A solução definitiva exigiria uma fila transacional de revisões pendentes e um reconciliador idempotente. A sequência diária também continua com um `SELECT/UPSERT` separado após a resposta e ainda merece tratamento concorrente.

**A migração `0015` foi criada somente na branch do PR** e deve ser instalada em homologação na sequência **0007–0015**, antes do código dependente, com testes reais de autenticação, backup e aprovação explícita para produção.

## Etapa 11 — sequências de estudos transacionais (29/10)

### Defeito encontrado na produção (leitura do esquema)

A action `submitAttempt` lia uma sequência de `streaks` e a regravava com `UPSERT` **depois** de registrar a resposta. Duas respostas simultâneas poderiam calcular a partir do mesmo estado antigo e perder atualizações. **Outro defeito confirmado:** o código tentava gravar uma string ISO week (ex.: `2026-W44`) em `streaks.last_freeze_week`, mas o PostgreSQL usa o tipo **DATE**. A correção muda as datas para a segunda-feira real da semana ISO em UTC.

### Migração `0016_atomic_study_streaks.sql`

- Adiciona a coluna opcional `streaks.last_freeze_used_on date`, sem apagar os dados anteriores; distingue **quando** um congelamento foi usado, oferecendo feedback preciso.
- Função `track_streak_from_attempt` com `SECURITY INVOKER` e `search_path` fixo, sem `EXECUTE` para `anon`/`authenticated`. Gatilho `AFTER INSERT` roda na **mesma transação** que registra a tentativa, após o gatilho da meta diária.
- Bloqueia a linha da sequência do aluno com `FOR UPDATE` **antes** de contar tentativas do dia. Com cinco tentativas elegíveis em UTC, contabiliza a data **uma vez**, mesmo quando respostas chegam simultaneamente; tentativas posteriores no mesmo dia não incrementam novamente.
- Em dias consecutivos, soma 1 à sequência. Em intervalo de dois dias, usa um congelamento da semana atual; em intervalo maior, ou sem congelamento, reinicia a sequência em 1. A maior sequência nunca retrocede.
- A semântica anterior da action convertia `n` respostas em `round(n × 1,2)` minutos. Nessa contagem, cinco respostas já satisfazem a regra de qualificação antes de dez minutos; por isso **o limiar efetivo é cinco respostas**, sem mudança nos resultados esperados para essa rota.
- O app passa a **somente ler** `current`, `last_study_date` e `last_freeze_used_on`; não escreve mais valores de sequência calculados de forma concorrente.

### Testes

- `tests/database/streaks.sql`: primeira sequência aos cinco exercícios, idempotência no mesmo dia, continuidade, congelamento, bloqueio do segundo uso na mesma semana, renovação por nova semana e isolamento dos alunos.
- `tests/database/streaks-concurrency.sh`: três tentativas iniciais e outras duas em **sessões PostgreSQL simultâneas**; exige exatamente cinco tentativas e incremento **único** da sequência.
- O CI executa todas as migrações `0001–0016` no PostgreSQL isolado; testes de login com Supabase Auth hospedado ainda são necessários antes da publicação.

### Ainda não resolvido

- O agendamento FSRS tem proteção contra sobrescrita (migração `0015`), mas ainda é feito após a tentativa. Falhas permanentes de agendamento exigem uma fila transacional/reconciliador.
- O registro da tentativa, a recompensa de XP e o ajuste da dificuldade empírica ainda não compartilham uma única transação completa; já há proteções parciais (revisão/XP/goal/Elo/streak).
- **Nenhuma migração `0007–0016` foi aplicada ao banco de produção**. O código novo depende delas; fazer homologação, backup testado e implantação coordenada antes de publicar.


## Etapa 12 — recuperação durável de FSRS (29/10)

### Problema

As migrações 0011 e 0015 impediam duplicação de respostas e sobrescrita de cartões, mas `submitAttempt` ainda precisava executar o agendamento em uma **segunda transação** após gravar a tentativa. Reinicialização do servidor, timeouts ou indisponibilidade temporária poderiam deixar uma resposta definitiva sem alteração de `srs_cards`. A notificação visual detectava algumas falhas, porém não recuperava a revisão sem outro processo.

### Migração 0017 — fila transacional e reconciliador idempotente

- `supabase/migrations/0017_durable_fsrs_outbox.sql`: tabela `srs_replay_queue` com **RLS ativado**, acesso somente ao serviço, `attempt_id` único, nota original, tempo real da tentativa, comprimento esperado e instante exato da resposta.
- O gatilho `trg_attempt_srs_replay` cria o evento **no mesmo commit da tentativa**. Se uma operação daquele commit falhar, a tentativa e seu evento são revertidos juntos.
- A RPC `complete_srs_replay`, disponível somente para `service_role`, bloqueia o evento pendente e aplica `commit_srs_schedule` (controle de revisão da migração 0015). O **cartão FSRS e a marcação de evento processado** são gravados na mesma transação. Se a gravação falha, o evento permanece pendente.
- A RPC rejeita eventos fora de ordem para o mesmo cartão. Concorrentes não conseguem registrar duas vezes a mesma tentativa.
- `src/lib/srs/reconcile.ts`: reconstrução da nota com `ts-fsrs`, considerando o **timestamp original** da tentativa e cartões atuais; processamento em lotes limitados, com repetição controlada em conflitos de revisão.
- `getNextQuestion` tenta recuperar eventos antigos antes de selecionar a próxima questão; `submitAttempt` tenta processar a fila após a gravação e avisa quando ainda restam pendências.
- `/api/cron/reconcile-srs`: POST autenticado exclusivamente por `Authorization: Bearer <CRON_SECRET>`, sem entrada externa para usuário ou cartão; processa lotes limitados e devolve resultado. O workflow existente `.github/workflows/push-reminders.yml` ganhou um job de recuperação independente usando `vars.APP_URL` e `secrets.CRON_SECRET` a cada 15 minutos **quando a versão for publicada na branch principal**.

### Testes

- `tests/database/srs-outbox.sql`: fila criada junto à tentativa, ordem temporal obrigatória, aplicação única, retomada após falha de função, proteção de permissões e sincronização da marcação de processamento com o cartão.
- `tests/database/srs-outbox-concurrency.sh`: dois recuperadores competem pela **mesma tentativa**; exatamente um marca sucesso, e cartão/evento terminam consistentes.
- Resultado do PostgreSQL isolado: https://github.com/Kronos1027/StudyMoon/actions/runs/40931717224 — aprovado, inclusive os testes novos. Executou as **17 migrações** em banco descartável.

### Limitações e condições antes de produção

1. Esta solução vale para tentativas **registradas após a instalação da migração 0017**. Ela não cria eventos retroativos para tentativas antigas.
2. O job agendado só funcionará depois do merge/publicação e se `APP_URL`, `CRON_SECRET` e o segredo de conexão do Supabase estiverem corretamente configurados. Conferir respostas e logs da rotina agendada.
3. O processador trata lotes limitados (20 por execução do cron). Um volume grande de pendências pode levar várias execuções; acompanhar métricas da fila e configurar alertas de atraso.
4. A fila oferece entrega **pelo menos uma vez**; a RPC garante que a aplicação **do mesmo evento** seja única. A disponibilidade final depende de o serviço voltar a processar eventos (não é uma garantia incondicional de prazo).
5. O novo aplicativo exige que as migrações `0007–0017` sejam instaladas **em homologação isolada** e validadas com Auth real antes da implantação coordenada. Nenhuma alteração no Supabase de produção foi feita neste PR.


## Etapa 13 — justiça da fila, tentativas progressivas e prevenção de bloqueio (29/10)

A fila FSRS da etapa 12 já preservava eventos após falhas, mas o reconciliador buscava simplesmente os 20 eventos mais antigos. Se um desses eventos falhasse continuamente, ele seria selecionado novamente em todas as chamadas e poderia ocupar o lote junto com eventos posteriores do mesmo cartão, atrasando outros estudantes.

### Migração 0018 — seleção justa e intervalo progressivo

- `0018_srs_retry_backoff.sql` acrescenta `retry_count`, `next_retry_at` e `last_error` em `srs_replay_queue`; os registros existentes continuam preservados.
- `get_ready_srs_replay`, acessível apenas ao `service_role`, retorna **somente o evento pendente mais antigo de cada par (estudante, questão)**, evitando que eventos posteriores pulem a fila daquele cartão. Eventos com nova tentativa agendada para o futuro não ocupam a execução atual.
- `defer_srs_replay` incrementa o contador e aplica **espera exponencial: 15 s, 30 s, 60 s, ..., no máximo 1 hora**. O evento permanece no banco; não existe descarte automático de falhas.
- `src/lib/srs/reconcile.ts` agora executa rodadas limitadas: quando um cartão termina, pode avançar para o próximo evento desse cartão na mesma execução. Em falha, o evento é marcado para nova tentativa, sem impedir os estudantes independentes. Também verifica se outro worker concluiu o evento antes de considerá-lo falha.
- `tests/database/srs-retry.sql` verifica privilégios, seleção justa, precedência cronológica, isolamento por usuário, progressão e teto de backoff, truncamento seguro de diagnósticos, recuperação posterior e ausência de reprocessamento após sucesso.
- O workflow do PostgreSQL descartável executa as **18 migrações** e inclui esses testes. É obrigatório verificar a execução final do CI do commit antes de qualquer merge.

### Limites e operação

- Um cartão com evento defeituoso continuará aguardando tentativas e deve aparecer em monitoramento: registrar contagem e idade do evento mais antigo, alertar quando ultrapassar o limiar operacional, investigar manualmente erros permanentes. Não apagar eventos de estudantes automaticamente.
- O cron depende de `APP_URL` e `CRON_SECRET` configurados e da publicação do endpoint. Em produção, o job rodará a cada 15 minutos; o valor de backoff é um **mínimo**, não uma promessa de conclusão nesse prazo.
- A lógica do PostgreSQL foi verificada em banco local descartável, não é substituto de testes com Auth real no Supabase e de planejamento de backup/rollback.
- **Migrações 0007–0018 são apenas propostas no PR; o banco real continua em 0001–0006.**


## Etapa 14 — monitoramento da fila FSRS e segurança do agendador (29/10)

A migração `0018` já separa revisões por cartão e adiciona espera progressiva. Esta etapa torna **visível o estado de saúde** da recuperação, sem revelar identidades, perguntas ou respostas dos estudantes.

- `src/lib/srs/health.ts`: função pura `assessSrsBacklog`, que classifica a fila como `clear` (vazia), `normal` (recente), `delayed` (ao menos uma nova tentativa ou espera de 60 minutos) ou `stale` (revisão pendente há 360 minutos ou timestamp inválido).
- `src/lib/srs/monitor.ts`: usa apenas a chave de servidor para consultar número total de eventos pendentes, número com `retry_count > 0` e horário do evento mais antigo. Retorna **somente agregados**. Uma falha de consulta não retorna falso sucesso.
- `POST /api/cron/reconcile-srs`: após recuperar um lote, também devolve a saúde da fila. Registra alertas apenas com agregados quando encontra `delayed` ou `stale`; responde com HTTP 503 em caso de backlog severamente atrasado, erros de recuperação ou falha de monitoramento. Isto torna a falha visível no workflow de cron.
- `tests/unit/srs-health.test.ts`: cobre fila vazia, fresca, primeiro retry, limiares de 60/360 minutos, timestamps inválidos, contagens inconsistentes e diferença de relógio. Logs/endpoint não retornam user_id, question_id nem conteúdo das respostas.
- **Segurança de credencial:** `/api/cron/reminders` não aceita mais `?secret=` na URL, evitando gravar o segredo em logs e históricos. Exige `Authorization: Bearer <CRON_SECRET>`, já empregado no workflow `.github/workflows/push-reminders.yml`.

### Validações ainda exigidas
- Verificar lint, typecheck, testes unitários, build e Playwright no **último SHA** do PR; não extrapolar aprovação de commits anteriores.
- Validar ambiente de homologação real com autenticação Supabase, configuração do cron e alertas controlados.
- No deploy, examinar se integrações externas antigas dependiam da query `secret` antes de removê-las definitivamente.
- Ainda **não instalar migrações 0007–0018 na produção**, que continua separada do PR em rascunho.


## Etapa 16 — workflow manual de Supabase Auth e auditoria de esquema (30/10)

O último commit anterior a esta etapa teve **CI e PostgreSQL integration totalmente verdes**, mas isso não constitui uma homologação com o serviço Supabase Auth hospedado.

- `.github/workflows/staging-auth-rls.yml` exige ambiente protegido `staging` e **acionamento explícito**: adição da label `verify-supabase-staging` ao PR para executar **antes do merge**, ou `workflow_dispatch` quando o arquivo já existir na branch principal. Não roda por push/PR normal, deploy, seed ou migração; cria/deleta apenas duas contas sintéticas temporárias via `test-rls.ts`. Essa alternativa por label é necessária porque o GitHub não disponibiliza `workflow_dispatch` para workflows presentes somente na branch do PR.
- `scripts/staging-schema-check.ts` compara por conjunto **todos os nomes do diretório `supabase/migrations`** com `_studymoon.migrations`. Se houver migrações ausentes ou inesperadas, aborta. Funções puras testadas em `tests/unit/staging-schema-check.test.ts`. O workflow possui também testes de acionamento opt-in em `tests/unit/staging-workflow.test.ts`.
- `scripts/check-staging-schema.ts` conecta ao banco **após o staging guard** e executa somente `SELECT` para comparar migrações e identificar tabelas públicas sem RLS. Não cria schemas/tabelas, não insere e não aplica SQL de migração. `pnpm staging:schema-check` executa essa checagem isoladamente.
- `scripts/test-rls.ts` agora exige a checagem de esquema antes de criar qualquer conta temporária; aborta também se a autenticação dos dois estudantes falhar, evitando false positives. Acrescentou verificações hospedadas de acesso negado às filas de FSRS, tickets e RPCs internos.
- Variáveis de staging (não produção) exigidas pelo workflow: `vars.STAGING_SUPABASE_PROJECT_REF`, `vars.STAGING_SUPABASE_URL`, `secrets.STAGING_DATABASE_URL`, `secrets.STAGING_SUPABASE_ANON_KEY` e `secrets.STAGING_SUPABASE_SECRET_KEY`. O ambiente `staging` deve exigir aprovação de revisores.
- Passos completos em `docs/STAGING_VALIDATION.md`. Não existe atualmente uma branch Supabase de homologação do StudyMoon disponível, e **nenhum projeto novo foi criado**.

**Limitação de verificação:** A suíte hospedada ainda não foi executada; configurar staging separado e suas credenciais exigirá autorização para possíveis custos. GitHub Actions SQL descartável e CI comum seguem sendo validados separadamente. Em produção continuam somente `0001–0006`.


## Etapa 18 — redações finalizadas atomicamente (30/10)

**Defeito confirmado:** `correctEssay` inseria o feedback e depois marcava a redação como corrigida em duas chamadas Supabase distintas. Uma falha após o primeiro commit deixava feedback sem status final. Como `essay_feedback` não tinha índice único por redação, um novo pedido podia persistir feedback duplicado.

A migração `0019_atomic_essay_finalization.sql` cria índice único `essay_feedback(essay_id)` e a RPC **service-only** `finalize_essay_correction`, que bloqueia a redação, conserva um feedback anterior já existente, grava (ou reutiliza) o feedback e muda `status` para `corrected` **na mesma transação PostgreSQL**. A action devolve o feedback realmente persistido, não uma nova saída da IA que possa ter sido descartada. Valida a identidade do aluno e exige `status='correcting'`.

Regressões: `tests/database/essay-finalization.sql` cobre status, replay, isolamento, erro de payload, preservação de feedback legado; `essay-finalization-concurrency.sh` envia duas finalizações simultâneas e exige uma única gravação. O PostgreSQL descartável da CI executou a nova migração e passou esses testes. Em consulta **agregada e somente leitura** ao Supabase de produção nesta data foram encontrados **0 grupos de feedback duplicado e 0 feedbacks com status diferente de corrigido**; isso não substitui nova checagem antes da futura migração.

## Etapa 19 — correção de simulados e XP transacionais (30/10)

**Defeito confirmado:** `finishMockExam` gravava respostas individualmente, depois o status/nota, depois criava o evento de XP e atualizava `profiles.xp` via `SELECT + UPDATE`. Em falhas ou duas requisições simultâneas, poderia surgir simulado parcialmente finalizado e perda de XP.

A migração `0020_atomic_mock_exam.sql` cria a RPC **service-only** `finalize_mock_exam`, com bloqueio `FOR UPDATE` do simulado. A resposta é corrigida exclusivamente contra os gabaritos do banco, **jamais** contra campos enviados pelo navegador; cada item, score e status são concluídos em uma única transação, juntamente com o prêmio de XP. A função `award_study_xp` foi ampliada para `mock_exam`, mantendo trava do perfil, limite diário de 100 XP e idempotência por (aluno,simulado), protegida por índice único parcial. O relatório separa explicitamente estimativa percentual de TRI verdadeira.

Regressões: `tests/database/mock-exam.sql` cobre 5 itens, omissão de resposta, pontuação por área, antifraude, resposta repetida, usuário errado e recompensa única. `mock-exam-concurrency.sh` faz duas finalizações simultâneas e exige um único prêmio de XP. A primeira execução mostrou um bug de `flagged=null` para questões não respondidas; a migração foi corrigida para `coalesce(flagged,false)` e reenviada à CI. Em consulta **somente leitura** à produção foram encontrados 0 grupos duplicados de XP do tipo `mock_exam` e 0 simulados finalizados sem score registrado. Revalidar esses valores antes da implantação.

## Etapa 20 — jobs mais seguros e falhas visíveis (30/10)

O endpoint de geração de conteúdo e o keepalive ainda permitiam `?secret=`, expondo credenciais a logs/URLs. Agora só aceitam o cabeçalho `Authorization: Bearer`, como os workflows já utilizavam. A geração noturna passa a devolver HTTP 503 quando qualquer lote falha; os workflows `content-nightly.yml` e `keepalive.yml` não suprimem mais erros HTTP com `|| true` e usam `curl --fail-with-body`. Testes `tests/unit/cron-hardening.test.ts` verificam os contratos.

### Restrições reais para afirmar funcionamento completo

- Testes unitários, Playwright smoke e PostgreSQL descartável **não substituem** login real com Supabase hospedado nem tráfego concorrente com usuários reais. O workflow de homologação com Auth foi preparado, mas **não executado**, pois não há staging separado configurado.
- A atualização de dificuldade de questões ainda é uma operação pós-resposta separada; nivelamento adaptativo e outros caminhos devem ser auditados quanto a idempotência e concorrência.
- A reserva da correção de redação `status='correcting'` pode persistir se o processo cair durante a chamada de IA; ainda precisa de protocolo seguro para expiração/reclamação de tarefas sem duplicar correções.
- A migração **0020** depende de **0019** e todas as anteriores, e o aplicativo novo deve ser implantado apenas após migrar um staging isolado e aprovar testes reais.
- **Não publicar nem mesclar o PR sem staging, testes Auth hospedados, backup/rollback verificados e aprovação expressa.** Produção permanece com **0001–0006**.
