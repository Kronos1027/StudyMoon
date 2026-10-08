# StudyMoon

Plataforma **gratuita** de preparação para o ENEM — do zero ao avançado — que mede o que o aluno sabe, se adapta a ele, ensina com demonstrações interativas, usa IA com parcimônia e cuida do hábito de estudo com metas, sequência e lembretes que chegam de verdade.

> Conteúdo gerado por IA pode conter erros. O StudyMoon não substitui os materiais oficiais do INEP.

## Stack

- **Next.js 16 (App Router) + TypeScript estrito**
- **Tailwind CSS 4 + shadcn/ui** — ícones Lucide (sem emojis), animações com Framer Motion
- **Supabase** — Postgres, Auth (e-mail/senha e Google) e RLS em todas as tabelas
- **IA com roteador e fallback** — Gemini → Groq → Cerebras → OpenRouter (modelos `:free`), cache agressivo e validação de tudo que a IA produz (Zod)
- **ts-fsrs** (repetição espaçada), **KaTeX** (matemática), **Recharts** (gráficos)
- **Web Push (VAPID)** + PWA instalável
- **Vitest** (unidade) e **Playwright** (e2e)
- **pnpm** como gerenciador de pacotes

## Desenvolvimento

```bash
pnpm install
cp .env.example .env.local   # preencha as variáveis (ver docs/SETUP.md)
pnpm dev                     # http://localhost:3000
```

Scripts principais:

| Comando | O que faz |
| --- | --- |
| `pnpm verify` | lint + typecheck + testes de unidade |
| `pnpm verify:full` | `verify` + build de produção |
| `pnpm e2e` | testes ponta a ponta (Playwright) |
| `pnpm setup` | migra o banco, importa o currículo, valida vídeos e roda o seed |
| `pnpm generate:vapid` | gera as chaves VAPID de push |

## Estrutura

```
src/app           rotas (splash, login, onboarding, painel, estudo, simulado, redação, ranking, perfil)
src/components    ui/ (shadcn), demos/ (simuladores interativos), charts/, gamification/, brand/
src/lib           db/ (Supabase), ai/ (providers, roteador, prompts, schemas), srs/, planner/, elo/, push/, content/
content           curriculo.json, videos.json, seeds/
scripts           setup, migrate, seed, generate-content, validate-content, check-videos, keepalive
supabase          migrations SQL versionadas
tests             unit/ e e2e/
docs              DECISIONS, KNOWN_ISSUES, ARCHITECTURE, SETUP, ATTRIBUTION
```

## Documentação

- [`docs/SETUP.md`](docs/SETUP.md) — passo a passo completo para configurar do zero
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — visão arquitetural
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — registro de decisões técnicas
- [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md) — problemas conhecidos
- [`PROGRESS.md`](PROGRESS.md) — progresso das fases de construção

## Licenças e fontes

Todo conteúdo reutilizado tem fonte e licença registradas em [`docs/ATTRIBUTION.md`](docs/ATTRIBUTION.md). Provas e matriz de referência do ENEM são públicas (INEP). O projeto é gratuito e sem fins comerciais.
