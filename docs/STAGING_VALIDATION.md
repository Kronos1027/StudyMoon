# StudyMoon — homologação segura do Supabase

**Estado:** plano de validação; este documento **não** autoriza mudança em produção.

A branch de revisão inclui migrações `0007`–`0018`, mas o projeto usado por estudantes ainda possui apenas `0001`–`0006`. O código novo depende do schema completo. **Não publicar a aplicação nem mesclar o PR antes de verificar as migrações num projeto Supabase separado.**

## 1. Criar o ambiente de homologação

- Criar um projeto Supabase separado e isolado, **somente após confirmar eventuais custos**. Não usar o projeto real nem copiar dados pessoais dos alunos.
- Não reaproveitar segredos, tokens JWT, chaves de serviço ou domínios de callbacks da produção. Configurar URLs de autenticação restritas à homologação.
- Conferir qual é o project ref da homologação no dashboard e a URL `https://<STAGING_REF>.supabase.co`. Guardar as credenciais apenas no ambiente local seguro ou num secret manager; nunca em commits/PRs/logs.
- Usar conteúdo público/sintético e contas temporárias; proibir importação de dados de estudantes reais.

## 2. Preparar os parâmetros e confirmar o destino

Os comandos abaixo são **ilustrativos** e não contêm credenciais reais. Substitua `<...>` no seu terminal; **não execute** com os marcadores literais.

```bash
export STUDYMOON_ENV=staging
export STUDYMOON_STAGING_PROJECT_REF='<REF_EXCLUSIVO_DA_HOMOLOGACAO>'
export STUDYMOON_PRODUCTION_PROJECT_REF='<REF_DA_PRODUCAO>'
export NEXT_PUBLIC_SUPABASE_URL='https://<REF_EXCLUSIVO_DA_HOMOLOGACAO>.supabase.co'
export NEXT_PUBLIC_SUPABASE_ANON_KEY='<CHAVE_PUBLICAVEL_HOMOLOGACAO>'
export SUPABASE_SECRET_KEY='<CHAVE_SECRETA_HOMOLOGACAO>'
export DATABASE_URL='postgresql://postgres:<SENHA>@db.<REF_EXCLUSIVO_DA_HOMOLOGACAO>.supabase.co:5432/postgres'
```

Para pooler, a conta PostgreSQL pode ter formato `postgres.<REF_EXCLUSIVO_DA_HOMOLOGACAO>` no hostname `*.pooler.supabase.com`. O guard reconhece apenas os formatos conhecidos e exige que URL de Auth e projeto do banco coincidam.

**Verificação prévia sem escrever nem conectar ao banco:** executar `pnpm staging:check` após configurar o ambiente. O comando rejeita URLs inconsistentes e imprime somente a referência pública da homologação, jamais a senha. Se falhar, não prosseguir.

**Proteção obrigatória e sem override:** `scripts/staging-guard.ts` é executado antes de qualquer escrita por `db:migrate`, `db:seed`, `setup` e `db:test-rls`. Ele exige `STUDYMOON_ENV=staging`, uma referência válida, os hosts correspondentes e bloqueia explicitamente o identificador conhecido do projeto de produção. Conexões localhost, URLs arbitrárias, projeto não reconhecido ou modo ausente são recusados. Para futura implantação de produção será necessário criar um **procedimento separado**, com revisão, backup, autorização e janela de rollback; não contornar o guard.

## 3. Validação de banco antes de Auth

- Executar os testes PostgreSQL **descartáveis** do GitHub Actions; confirmar as 18 migrações, permissões RLS, triggers e condições de corrida.
- Fazer inventário e backup do **projeto de homologação**. Inspecionar migrações pendentes via consulta somente de leitura a `_studymoon.migrations`; cuidado: este projeto usa essa tabela personalizada, não necessariamente o histórico da Supabase CLI.
- Aplicar `pnpm db:migrate` **somente no staging validado**. Verificar `_studymoon.migrations` de `0001` até `0018` (não reaplicar migrações já registradas).
- Executar `pnpm db:seed` só com conteúdo sintético, se necessário; inspecionar grants, RLS e funções `service_role`. Não importar sessões, perfis ou tentativas reais.

## 4. Autenticação real e fluxos completos

`pnpm db:test-rls` cria dois estudantes **temporários** no projeto de homologação, autentica os dois com a chave pública e tenta remover essas contas no `finally`. O teste falha se qualquer login não funcionar; não usa dados reais.

Verificações obrigatórias adicionais antes de liberar uma implantação:

- Cadastro/login/logout e isolação cruzada de perfil, tentativas e sequência.
- Questões públicas sem `answer_key`, `numeric_expr`, metadados privilegiados; a coluna `subtopic` e `demo_params` permanece disponível.
- RPCs de XP, tickets, recuperação FSRS e fila interna **não executáveis por `anon`/`authenticated`**.
- Em sessão autenticada: carregar questão, responder, impedir repetição, calcular XP, Elo, metas, streak e FSRS; enviar duas respostas concorrentes e conferir que somente uma é contabilizada.
- Interromper propositalmente o processamento FSRS em homologação, confirmar evento pendente, restaurar serviço, verificar recuperação **exatamente uma vez** e alertas `delayed/stale`.
- Testar tutor: apenas 20 reservas por dia UTC, 21ª negada, duas solicitações disputando a última vaga, devolução após erro.
- Correção de redação, salvamento do rascunho, uma única recompensa por redação, falha de provedor e recuperação.

## 5. Cron hospedado e observabilidade

Configurar somente na homologação `APP_URL`, `CRON_SECRET`, variáveis do Supabase e, quando necessário, VAPID. Testar chamadas POST aos endpoints `/api/cron/reminders` e `/api/cron/reconcile-srs` com Bearer; confirmar HTTP 401 sem credenciais. Não transmitir segredo via URL, nem imprimir tokens nos logs. Verificar contagem de filas, retries e idade do item mais antigo, sem expor identificadores de alunos. O cron atual do GitHub executa na branch principal: **um PR em rascunho não inicia automaticamente o novo job na hospedagem**.

## 6. Condições de aprovação e retorno seguro

Só considerar implantação após: testes CI e PostgreSQL aprovados no último commit, teste Auth hospedado concluído, compatibilidade de schemas demonstrada, backup restaurável verificado, checagem da configuração de deployment e aprovação explícita. Preparar restauração de banco e rollback da aplicação **em conjunto** (migrar o schema sem compatibilidade pode quebrar a versão antiga; voltar código sem reverter dependências pode falhar).

**Não executar scripts de homologação nem aplicar migrações usando o ref de produção.**
