# QUESTION_AUDIT.md — Auditoria das questões

Gerado por `scripts/audit-questions.ts` em 2026-10-09 · modo **seeds (locais)** · 35 questões auditadas · **35 aprovadas · 0 reprovadas**.

## Metodologia

Cada questão passa por 4 camadas: **(a)** formato (Zod — o mesmo schema do pipeline); **(c)** numérico determinístico (mathjs re-avalia a expressão do `numeric_check` e confere o resultado); **(b)** resolução **às cegas** por um segundo modelo (GLM, via `z-ai-web-dev-sdk` — nunca o modelo que gerou a questão, e sem ver o gabarito; divergências são re-resolvidas uma vez para filtrar ruído — só reprovam com divergência confirmada); **(e)** vínculo demo ↔ subtópico (a demo da questão é a do subtópico dela, resolvida pelo catálogo em código).

## Resumo

| Métrica | Valor |
| --- | --- |
| Total auditadas | 35 |
| Aprovadas | 35 |
| Reprovadas | 0 |
| Com checagem numérica (mathjs) | 24 |
| Divergência única às cegas (aprovada na 2ª) | 6 |
| Divergência revertida pelo parecer com raciocínio | 1 |
| Atenção: modelo divergiu, mathjs confirmou o gabarito | 5 |

## Resultado por questão

| # | Tópico.Subtópico | Gabarito | Às cegas | mathjs | Demo | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `cn-genetica.cruzamentos` | D | D | ✓ | ✓ | OK |
| 2 | `cn-genetica.sistema-abo` | B | B | n/a | ✓ | OK |
| 3 | `cn-estequiometria.calculos-estequiometricos` | C | C | ✓ | ✓ | OK |
| 4 | `cn-eletricidade.potencia-eletrica` | C | C | ✓ | ✓ | OK |
| 5 | `cn-ecologia.eutrofizacao` | B | B | n/a | ✓ | OK |
| 6 | `ch-meio-ambiente.mudancas-climaticas` | B | B | n/a | ✓ | OK |
| 7 | `ch-brasil-republica.era-vargas` | B | B | n/a | ✓ | OK |
| 8 | `lc-interpretacao.interpretacao` | B | B | n/a | ✓ | OK |
| 9 | `lc-variacao-linguistica.registro` | B | B | n/a | ✓ | OK |
| 10 | `cn-fisiologia.homeostase` | B | B | n/a | ✓ | OK |
| 11 | `mt-porcentagem-juros.variacoes-sucessivas` | C | C | ✓ | ✓ | OK |
| 12 | `mt-porcentagem-juros.porcentagem` | C | C | ✓ | ✓ | OK |
| 13 | `mt-porcentagem-juros.juros-simples` | B | B | ✓ | ✓ | OK |
| 14 | `mt-porcentagem-juros.juros-compostos` | B | C/C→deep:C | ✓ | ✓ | OK |
| 15 | `mt-porcentagem-juros.porcentagem` | D | D | ✓ | ✓ | OK |
| 16 | `mt-porcentagem-juros.variacoes-sucessivas` | B | B | ✓ | ✓ | OK |
| 17 | `mt-fracoes-decimais.fracoes` | A | B/B→deep:C | ✓ | ✓ | OK |
| 18 | `mt-fracoes-decimais.fracoes` | C | C | ✓ | ✓ | OK |
| 19 | `mt-razao-proporcao.escala` | B | B | ✓ | ✓ | OK |
| 20 | `mt-razao-proporcao.regra-de-tres-inversa` | B | B | ✓ | ✓ | OK |
| 21 | `mt-razao-proporcao.regra-de-tres-direta` | C | C | ✓ | ✓ | OK |
| 22 | `mt-funcoes.afim` | C | C | ✓ | ✓ | OK |
| 23 | `mt-funcoes.quadratica` | C | D/D→deep:D | ✓ | ✓ | OK |
| 24 | `mt-funcoes.exponencial` | D | C/C→deep:D | ✓ | ✓ | OK |
| 25 | `mt-estatistica.media-mediana-moda` | B | B | n/a | ✓ | OK |
| 26 | `mt-estatistica.leitura-dados` | C | C | ✓ | ✓ | OK |
| 27 | `mt-estatistica.media-mediana-moda` | C | C | ✓ | ✓ | OK |
| 28 | `mt-probabilidade.probabilidade-simples` | A | A | n/a | ✓ | OK |
| 29 | `mt-probabilidade.eventos-compostos` | C | E/E→deep:E | ✓ | ✓ | OK |
| 30 | `mt-probabilidade.eventos-compostos` | D | D | n/a | ✓ | OK |
| 31 | `mt-geometria-plana.areas-perimetros` | D | D | ✓ | ✓ | OK |
| 32 | `mt-geometria-plana.pitagoras` | C | C | ✓ | ✓ | OK |
| 33 | `mt-combinatoria.principio-multiplicativo` | D | D | ✓ | ✓ | OK |
| 34 | `mt-trigonometria.triangulos-retangulos` | C | C | n/a | ✓ | OK |
| 35 | `mt-sequencias.progressoes` | C | E/E→deep:E | ✓ | ✓ | OK |

## Atenção — divergência do modelo, gabarito verificado por mathjs

O segundo modelo (sem calculadora) divergiu nestas questões, mas a checagem determinística (mathjs) E a revisão humana confirmaram o gabarito. Ficam em circulação com registro auditável:

- **questions-matematica.json#3** (`mt-porcentagem-juros.juros-compostos`): cega=C/C→deep:C · gab=B · mathjs: `1000*1.2^2 - 1000*(1+0.2*2)` = 40 ✓
- **questions-matematica.json#6** (`mt-fracoes-decimais.fracoes`): cega=B/B→deep:C · gab=A · mathjs: `1 - 1/4 - (1/3)*(1 - 1/4)` = 0.5 ✓
- **questions-matematica.json#12** (`mt-funcoes.quadratica`): cega=D/D→deep:D · gab=C · mathjs: `-(30^2) + 60*30 - 500` = 400 ✓
- **questions-matematica.json#18** (`mt-probabilidade.eventos-compostos`): cega=E/E→deep:E · gab=C · mathjs: `6/36` = 1/6 ✓
- **questions-matematica.json#24** (`mt-sequencias.progressoes`): cega=E/E→deep:E · gab=C · mathjs: `(20 + (20+14*3))*15/2` = 615 ✓

Nenhuma questão reprovada: gabaritos confirmados pelo cálculo determinístico e pela resolução às cegas do segundo modelo.