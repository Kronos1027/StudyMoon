# SETUP.md — Passo a passo completo (do zero ao deploy)

Guia para configurar o StudyMoon do zero. Você faz estas etapas **uma única vez**; todo o resto é automatizado por scripts.

---

## 1. Pré-requisitos

- Conta no [GitHub](https://github.com) (este repositório)
- [Node.js 24+](https://nodejs.org) e [pnpm](https://pnpm.io) (`npm i -g pnpm`)
- Contas gratuitas: [Supabase](https://supabase.com), [Vercel](https://vercel.com), [Google AI Studio](https://aistudio.google.com)

Clone e instale:

```bash
git clone https://github.com/Kronos1027/StudyMoon.git
cd StudyMoon
pnpm install
cp .env.example .env.local
```

## 2. Supabase (banco + login)

1. Acesse [supabase.com](https://supabase.com) → **New project** (plano Free). Guarde a senha do banco.
2. No projeto, abra **Project Settings → Data API**:
   - **Project URL** → cole em `NEXT_PUBLIC_SUPABASE_URL`
   - Aba **API Keys** → **Publishable key** (`sb_publishable_...`) → cole em `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Secret key** (`sb_secret_...`) → cole em `SUPABASE_SECRET_KEY`
3. Em **Project Settings → Database → Connection string → URI**: substitua `[YOUR-PASSWORD]` pela senha real → cole em `DATABASE_URL` (use a *Session pooler*, porta 5432).
   - **Atenção ao tipo de conexão:** o host direto `db.<ref>.supabase.co` resolve apenas IPv6. Se o seu ambiente só tem saída IPv4 (a maioria das redes corporativas e VMs), use o **Session pooler**: host `aws-1-<região>.pooler.supabase.com:5432`, usuário `postgres.<ref>`. A região deste projeto é `us-west-2` (hostname: `aws-1-us-west-2.pooler.supabase.com`).
   - **Senha com caracteres especiais** precisa de percent-encoding na URI: `:` → `%3A`, `@` → `%40`, `/` → `%2F` etc.
   - Para descobrir o pooler certo por DNS/região: `scripts/find-region.py` + `scripts/probe-pooler.mjs`.
4. **Login com Google (opcional, recomendado):**
   - No [Google Cloud Console](https://console.cloud.google.com), crie um projeto → **APIs & Services → OAuth consent screen** (External) → **Credentials → Create OAuth client ID → Web application**.
   - Authorized redirect URI: `https://SEU-PROJETO.supabase.co/auth/v1/callback`
   - Copie o **Client ID** e o **Client Secret** → no Supabase: **Authentication → Providers → Google** → cole e salve.
   - Nota: o botão "Entrar com Google" só aparece quando o provedor está ativado no Supabase (o app consulta `GET /auth/v1/settings` com cache de 5 min) — ativou, ele aparece sozinho.
   - Em **Authentication → URL Configuration**: Site URL = URL de produção; Redirect URLs = `http://localhost:3000/**` e a URL de produção.
5. Rode a mágica:

```bash
pnpm setup    # cria todas as tabelas (migrations), importa o currículo, valida vídeos e roda o seed
pnpm db:test-rls   # confirma que a política de isolamento entre usuários funciona
```

## 3. IA (provedores)

Ordem de fallback: **Gemini → Groq → Cerebras → OpenRouter**. Só o Gemini é obrigatório na prática.

1. **Gemini:** [Google AI Studio](https://aistudio.google.com/apikey) → **Create API key** → cole em `GEMINI_API_KEY`. O nome do modelo fica em `GEMINI_MODEL` (padrão `gemini-3.8-flash` — confira o nome atual do Flash gratuito no AI Studio).
2. **Groq (opcional):** [console.groq.com/keys](https://console.groq.com/keys) → cole em `GROQ_API_KEY`.
3. **Cerebras / OpenRouter (opcionais):** chaves em `cloud.cerebras.ai` e `openrouter.ai/keys` (modelos com sufixo `:free`).

## 4. Notificações (Web Push)

```bash
pnpm generate:vapid
```

Cole a saída em `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` (e `VAPID_SUBJECT`, formato `mailto:seu@email.com`).

Gere um segredo para o agendador:

```bash
openssl rand -hex 24   # cole em CRON_SECRET
```

> No iPhone, as notificações só funcionam com o site instalado na tela de início — o app mostra um guia curto de instalação no momento certo.

## 5. Rodar localmente

```bash
pnpm dev       # http://localhost:3000
pnpm verify    # lint + typecheck + testes
pnpm e2e       # ponta a ponta (com o dev server rodando)
```

## 6. Vercel (deploy)

1. [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório `Kronos1027/StudyMoon`.
2. Framework: Next.js (detectado automaticamente). Build command e output deixe o padrão.
3. **Environment Variables:** cole TODAS as variáveis do seu `.env.local` (as `NEXT_PUBLIC_` só a `NEXT_PUBLIC_APP_URL`, que aqui vira a URL final, ex. `https://studymoon.vercel.app`).
4. Deploy. Em cada push na `main` a Vercel publica automaticamente e o CI do GitHub roda lint/typecheck/testes/build.

## 7. Secrets e variáveis do GitHub (para CI e rotinas noturnas)

No repositório → **Settings → Secrets and variables → Actions**:

**Secrets** (valores secretos), uma a uma:

| Secret | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key |
| `SUPABASE_SECRET_KEY` | secret key |
| `DATABASE_URL` | string de conexão (backup semanal) |
| `CRON_SECRET` | o mesmo do `.env` |
| `GEMINI_API_KEY` | chave do AI Studio |
| `GROQ_API_KEY` / `OPENROUTER_API_KEY` | se tiver |

**Variables** (não secretas) → aba *Variables*:

| Variable | Valor |
| --- | --- |
| `APP_URL` | URL de produção (ex.: `https://studymoon.vercel.app`) — usada pelos agendadores |

> O StudyMoon já vem com workflows prontos: CI (todo push), lembretes a cada 15 min, geração noturna de conteúdo, keepalive diário e backup semanal. Eles só acordam depois que os itens acima existirem.

## 8. Checklist final

- [ ] `pnpm verify` e `pnpm e2e` verdes
- [ ] Cadastro por e-mail funciona e o teste de nível aparece
- [ ] Login com Google funciona (se configurou o passo 2.4)
- [ ] Notificação chega com o PWA instalado (Android/iOS)
- [ ] Nenhuma chave no repositório (`pnpm dlx gitleaks detect --source .`)
