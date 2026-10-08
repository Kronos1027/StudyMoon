# ATTRIBUTION.md — Fontes e licenças

Registro de todo conteúdo reutilizado, conforme exigência da seção 14 do documento mestre (LGPD + licenças).

## Conteúdo oficial do ENEM

- **Provas e gabaritos oficiais** — Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira (INEP). Material público; questões reais citam **ano e caderno** de origem.
- **Matriz de Referência do ENEM** (INEP) — esqueleto do currículo (`content/curriculo.json`).

## Conteúdo de referência (a IA reescreve com palavras próprias e cita a fonte)

| Fonte | Uso | Licença |
| --- | --- | --- |
| Khan Academy (pt) | referência de explicações | CC BY-NC-SA (material do site; usamos apenas como referência conceitual, sem cópia) |
| Wikipédia / Wikilivros (pt) | referência geral | CC BY-SA |
| PhET Interactive Simulations | simulações de física/química incorporadas | CC BY 4.0 (links oficiais por embed) |
| GeoGebra | materiais de matemática (referência) | Licença GeoGebra (não comercial) |
| IBGE Cidades / dados abertos | dados de geografia e atualidades | dados abertos (Licença IBGE) |
| Domínio público / Projeto Gutenberg | literatura integral em domínio público | domínio público |

## Vídeos

Apenas **embed oficial** via `youtube-nocookie.com`, sempre de canais educacionais brasileiros reconhecidos. Nenhum vídeo é baixado ou re-hospedado. Cada link é validado pelo endpoint oEmbed do YouTube antes de ser listado (`pnpm check-videos`).

## Bibliotecas e ferramentas

Todas as dependências do projeto são de código aberto (MIT/Apache/ISC), listadas em `package.json`. Em destaque: Next.js (MIT), Tailwind CSS (MIT), shadcn/ui (MIT), ts-fsrs (MIT), KaTeX (MIT), Recharts (ISC), mathjs (Apache-2.0), web-push (MIT), Framer Motion (MIT).

## Geração por IA

Questões, explicações e correções geradas por IA são produzidas a partir de conceitos — nunca cópias de cursinhos, apostilas ou sites protegidos. O produto exibe o aviso: *"Conteúdo gerado por IA pode conter erros. O StudyMoon não substitui os materiais oficiais do INEP."*
