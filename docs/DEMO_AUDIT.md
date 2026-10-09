# DEMO_AUDIT.md — Auditoria dos simuladores interativos

Gerado por `scripts/audit-demos.ts` em 2026-10-09 · modo de vínculo: **tópico** · 15 simuladores · 35 questões seed · 32 questões com demo no estado atual.

> Regra permanente (docs/DECISIONS.md): nenhum simulador novo pode ser criado sem (1) vínculo a um subtópico, (2) testes numéricos e (3) entrada neste documento. Demo errada é pior que nenhuma demo.

## Visão geral

| Simulador | Arquivo | Área | Vínculo | Questões que exibem | Status |
| --- | --- | --- | --- | --- | --- |
| `balanceamento` | src/components/demos/balanceamento-demo.tsx | cn | `cn-estequiometria`<br>`cn-equilibrio-eletroquimica` | 1 | ⚠️ 1 problema(s) |
| `divisao` | src/components/demos/divisao-demo.tsx | mt | `mt-operacoes-basicas`<br>`mt-divisibilidade` | 0 | OK |
| `estatistica` | src/components/demos/estatistica-demo.tsx | mt | `mt-estatistica`<br>`mt-graficos-tabelas` | 3 | ⚠️ 1 problema(s) |
| `eutrofizacao` | src/components/demos/eutrofizacao-demo.tsx | cn | `cn-ecologia` | 1 | OK |
| `fracoes` | src/components/demos/fracoes-demo.tsx | mt | `mt-fracoes-decimais` | 2 | OK |
| `funcoes` | src/components/demos/funcoes-demo.tsx | mt | `mt-funcoes`<br>`mt-geometria-analitica` | 3 | ⚠️ 1 problema(s) |
| `genetica` | src/components/demos/genetica-demo.tsx | cn | `cn-genetica` | 2 | ⚠️ 1 problema(s) |
| `geometria` | src/components/demos/geometria-demo.tsx | mt | `mt-geometria-plana`<br>`mt-geometria-espacial` | 2 | ⚠️ 1 problema(s) |
| `linha-tempo` | src/components/demos/linha-tempo-demo.tsx | lc, ch | `lc-literatura-movimentos`<br>`ch-brasil-colonia`<br>`ch-brasil-imperio`<br>`ch-brasil-republica`<br>`ch-historia-geral` | 1 | ⚠️ 1 problema(s) |
| `mapas` | src/components/demos/mapas-demo.tsx | ch | `ch-geo-fisica`<br>`ch-geo-humana`<br>`ch-cartografia`<br>`ch-meio-ambiente` | 1 | ⚠️ 1 problema(s) |
| `phet` | src/components/demos/phet-demo.tsx | cn | `cn-mecanica`<br>`cn-energia-trabalho`<br>`cn-ondas-optica`<br>`cn-eletricidade` | 1 | ⚠️ 1 problema(s) |
| `porcentagem` | src/components/demos/porcentagem-demo.tsx | mt | `mt-porcentagem-juros` | 6 | OK |
| `probabilidade` | src/components/demos/probabilidade-demo.tsx | mt | `mt-probabilidade`<br>`mt-combinatoria` | 4 | ⚠️ 2 problema(s) |
| `razao-proporcao` | src/components/demos/razao-proporcao-demo.tsx | mt | `mt-razao-proporcao` | 3 | ⚠️ 2 problema(s) |
| `textos` | src/components/demos/textos-demo.tsx | lc | `lc-interpretacao`<br>`lc-generos-tipos`<br>`lc-variacao-linguistica`<br>`lc-figuras-linguagem` | 2 | ⚠️ 1 problema(s) |

## Detalhe por simulador

### `balanceamento`

- **Arquivo:** `src/components/demos/balanceamento-demo.tsx`
- **Área:** cn
- **Vinculada a (tópico):** `cn-estequiometria`, `cn-equilibrio-eletroquimica`
- **Questões seed que exibem:** 1

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| A massa de água produzida na reação completa de 8 g de hidrogênio (H₂)… | `cn-estequiometria` | — |

- **PROBLEMA:** Vinculada a cn-equilibrio-eletroquimica, mas a demo é o balanceamento molecular H₂+O₂→H₂O, sem relação com equilíbrio químico/eletroquímica. O botão do coeficiente também DECREMENTA ao ser clicado (confuso).
  - **Correção:** Vinculada a cn-estequiometria.balanceamento e cn-estequiometria.calculos-estequiometricos; botão vira exibição.

<details><summary>Textos e fórmulas exibidos (34 trechos extraídos do código)</summary>

- ; /** * Equation balancing: drag-free
- ; import { Button } from
- ; import { cn } from
- ; import { motion, useReducedMotion } from
- ; import { RotateCcw, CheckCircle2 } from
- (alvo: ${target})
- } className=
- /> <p className=
- /> <span>H₂</span> <span className=
- /> <span>H₂O</span> </div> {/* Atom counts */} <div className=
- /> <span>O₂</span> <span className=
- /> Recomeçar </Button> </div> )} <div className=
- > {Array.from({ length: Math.min(12, leftH) }, (_, i) => ( <motion.span key={
- > <CoefStepper value={coefA} onChange={setCoefA} label=
- > <div className=
- > <h3 className=
- > <p className=
- > <p>Átomos não podem aparecer nem sumir — ajuste os coeficientes.</p> <Button variant=
- > <section aria-label=
- > Ajuste os coeficientes até os átomos se equilibrarem </h3> <div className=
- > Antes da seta (reagentes) </p> <AtomRow element=
- > Depois da seta (produtos) </p> <AtomRow element=
- > Equilibrada! 2H₂ + O₂ → 2H₂O — a mesma quantidade de átomos entra e sai. </p> </motion.div> ) : ( <div className=
- >→</span> <CoefStepper value={coefC} onChange={setCoefC} label=
- >+</span> <CoefStepper value={coefB} onChange={setCoefB} label=
- Aumentar ${label}
- coeficiente atual: ${value}
- count={leftH} target={rightH} /> <AtomRow element=
- count={leftO} target={rightO} /> </div> <div className=
- count={rightH} target={leftH} /> <AtomRow element=
- count={rightO} target={leftO} /> </div> </div> {balanced ? ( <motion.div className=
- Diminuir ${label}
- initial={reduced ? undefined : { scale: 0.95, opacity: 0 }} animate={reduced ? undefined : { scale: 1, opacity: 1 }} > <CheckCircle2 className=
- onClick={reset}> <RotateCcw className=

</details>

### `divisao`

- **Arquivo:** `src/components/demos/divisao-demo.tsx`
- **Área:** mt
- **Vinculada a (tópico):** `mt-operacoes-basicas`, `mt-divisibilidade`
- **Questões seed que exibem:** 0

<details><summary>Textos e fórmulas exibidos (31 trechos extraídos do código)</summary>

- ; import { motion, useReducedMotion } from
- ; import { Slider } from
- } /> ))} </div> </motion.div> ) : ( <p className=
- } /> ))} </div> </motion.div> ))} {remainder > 0 ? ( <motion.div className=
- } <strong className=
- }> {boxes.map((box, boxIndex) => ( <motion.div key={boxIndex} className=
- /> </div> </div> <p className=
- /> </div> <div> <label htmlFor=
- > {Array.from({ length: remainder }, (_, i) => ( <span key={i} className=
- > {box.map((item) => ( <span key={item} className=
- > {total} ÷ {boxSize} ={
- > {total} objetos em caixas de {boxSize} </h3> <p className=
- > <div className=
- > <div> <label htmlFor=
- > <h3 className=
- > <section aria-label=
- > caixa {boxIndex + 1} </span> <div className=
- > Divisão exata: nada sobra — o resto é 0. </p> )} </div> <div className=
- > sobra (resto) </span> <div className=
- > Tamanho da caixa (divisor): <strong className=
- > Total de objetos: <strong className=
- >{boxSize}</strong> </label> <Slider id=
- >{quotient}</strong> {remainder > 0 ? ( <> {
- >{remainder}</strong> </> ) : null} </p> </div> <div className=
- >{total}</strong> </label> <Slider id=
- className=
- e ${remainder} objetos sobrando
- initial={reduced ? undefined : { opacity: 0 }} animate={reduced ? undefined : { opacity: 1 }} transition={{ delay: quotient * 0.08 }} > <span className=
- initial={reduced ? undefined : { opacity: 0, y: 10 }} animate={reduced ? undefined : { opacity: 1, y: 0 }} transition={{ delay: boxIndex * 0.08 }} > <span className=
- value={[boxSize]} onValueChange={([v]) => setBoxSize(Math.max(1, v))} min={1} max={8} step={1} aria-label=
- value={[total]} onValueChange={([v]) => setTotal(v)} min={1} max={30} step={1} aria-label=

</details>

### `estatistica`

- **Arquivo:** `src/components/demos/estatistica-demo.tsx`
- **Área:** mt
- **Vinculada a (tópico):** `mt-estatistica`, `mt-graficos-tabelas`
- **Questões seed que exibem:** 3

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| Para descrever o salário típico dos funcionários, o valor mais represe… | `mt-estatistica` | — |
| O crescimento percentual das vendas diárias de janeiro para fevereiro … | `mt-estatistica` | — |
| A média mensal de empréstimos nesse período foi de… | `mt-estatistica` | — |

- **PROBLEMA:** 'Adicionar aluno' sorteia nota com Math.random() (não determinístico) e a demo era vinculada a mt-graficos-tabelas, cujo foco é leitura de gráficos, não média/mediana/moda.
  - **Correção:** Nota inicial determinística; vinculação só a mt-estatistica.media-mediana-moda.

<details><summary>Textos e fórmulas exibidos (36 trechos extraídos do código)</summary>

- , )} > {item.valor} </span> <button onClick={() => changeValue(i, 1)} className=
- , border:
- , borderRadius: 12, fontSize: 12, }} /> <Bar dataKey=
- , item.valor === mean ?
- , valor: 6 }, { name:
- , valor: 7 }, { name:
- , valor: 8 }, { name:
- , valor: 9 }, { name:
- ; import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from
- ; import { Button } from
- ; import { cn } from
- ; import { Minus, Plus } from
- )} </p> </div> <div className=
- ]; const name = names[data.length % names.length]; setData((d) => [...d, { name, valor: Math.ceil(Math.random() * 10) }]); } return ( <div className=
- ]} contentStyle={{ background:
- } </p> </div> </section> <p className=
- } > + </button> </div> ))} </div> <div className=
- } > − </button> <span className={cn(
- }} /> <Tooltip formatter={(value) => [
- }} /> <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill:
- /> Aluno </Button> <Button variant=
- /> Remover </Button> </div> </div> <div className=
- > {data.map((item, i) => ( <div key={item.name + i} className=
- > {mean.toFixed(1).replace(
- > {median.toString().replace(
- > {modes.length > 0 ? modes.join(
- > <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}> <CartesianGrid stroke=
- > <Button variant=
- > <div className=
- > <h3 className=
- > <p className=
- > <ResponsiveContainer width=
- > <section aria-label=
- > <span className=
- > Coloque uma nota muito baixa em um aluno e veja a média cair enquanto a mediana quase não se mexe — é por isso que a mediana representa melhor o
- > Notas de uma turma — mexa nos valores </h3> <div className=

</details>

### `eutrofizacao`

- **Arquivo:** `src/components/demos/eutrofizacao-demo.tsx`
- **Área:** cn
- **Vinculada a (tópico):** `cn-ecologia`
- **Questões seed que exibem:** 1

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| O fenômeno descrito e sua principal consequência para os peixes são, r… | `cn-ecologia` | — |

<details><summary>Textos e fórmulas exibidos (36 trechos extraídos do código)</summary>

- , }; if (current.algas >= 30) return { tone:
- , }; if (current.od < 4) return { tone:
- , }; return { tone:
- , status.tone)} > {status.text} </p> </section> {/* 3. Dissolved oxygen chart */} <section aria-label=
- , text:
- ; // --------------------------------------------------------------------------- // Deterministic eutrophication model (per
- ; const status = useMemo(() => { if (current.peixesVivos === 0) return { tone:
- ; import { Button } from
- ; import { cn } from
- ; import { Droplets, Fish, Pause, Play, RotateCcw, StepForward } from
- ; import { motion, useReducedMotion } from
- ; import { Slider } from
- : current.od >= 3 ?
- ); return { w, toX, toY, points, xMax }; }, [history]); return ( <div className=
- } } /> ))} {/* Algae film on the surface */} <div className=
- } className=
- }} > <Fish className=
- }> {[2, 4, 6, 8].map((v) => ( <line key={v} x1={8} x2={312} y1={118 - (v / 8) * 106} y2={118 - (v / 8) * 106} className=
- /> {/* Sewage pipe */} {carga > 0 ? ( <div className=
- /> </motion.span> ))} {/* Dead fish floating belly-up */} {Array.from({ length: deadFish }, (_, i) => ( <motion.span key={i} className=
- /> </svg> </div> </section> {/* 4. Controls */} <section aria-label=
- /> <div className=
- /> <span className=
- /> <text x={10} y={118 - (3 / 8) * 106 - 4} className=
- /> 1 semana </Button> <Button size=
- /> Carga de esgoto despejada no lago </h3> <span className=
- /> Pausar </> ) : ( <> <Play className=
- /> Reiniciar </Button> </section> <p className=
- /> Simular </> )} </Button> <Button size=
- > {/* 1. Sewage-load control */} <section aria-label=
- > {/* Sun glimmer */} <div className=
- > <Button size=
- > <div className=
- > <div role=
- > <Droplets className=
- > <h3 className=

</details>

### `fracoes`

- **Arquivo:** `src/components/demos/fracoes-demo.tsx`
- **Área:** mt
- **Vinculada a (tópico):** `mt-fracoes-decimais`
- **Questões seed que exibem:** 2

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| A fração do tempo total planejado que ainda falta estudar é… | `mt-fracoes-decimais` | — |
| De um total de 200 livros de uma biblioteca comunitária, $\frac{2}{5}$… | `mt-fracoes-decimais` | — |

<details><summary>Textos e fórmulas exibidos (27 trechos extraídos do código)</summary>

- , on ?
- ; import { cn } from
- ; import { motion, useReducedMotion } from
- ; import { Slider } from
- } > {Array.from({ length: denominator }, (_, i) => { const on = i < clampedNumerator; return ( <motion.div key={
- } className=
- } className={cn(
- /> </div> </div> </section> {equivalents.length > 0 ? ( <section aria-label=
- > {clampedNumerator}/{denominator} </span> {equivalents.map((f) => ( <span key={
- > {f.n}/{f.d} </span> ))} </div> <p className=
- > <div className=
- > <h3 className=
- > <section aria-label=
- > <span className=
- > A fração pinta as partes escolhidas </h3> <span className=
- > Em quantas partes dividir o todo: <strong className=
- > Frações equivalentes (mesma quantidade pintada) </h3> <div className=
- > Quantas partes pintar: <strong className=
- >{clampedNumerator}</span> <span className=
- >{clampedNumerator}</strong> </label> <Slider id=
- >{denominator}</span> </span> </div> <div className=
- >{denominator}</strong> </label> <Slider id=
- >/</span> <span className=
- className=
- Denominador da fração
- role=
- value={[clampedNumerator]} onValueChange={([v]) => setNumerator(v)} min={0} max={denominator} step={1} aria-label=

</details>

### `funcoes`

- **Arquivo:** `src/components/demos/funcoes-demo.tsx`
- **Área:** mt
- **Vinculada a (tópico):** `mt-funcoes`, `mt-geometria-analitica`
- **Questões seed que exibem:** 3

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| Se uma corrida custou R$ 35,00, a distância percorrida foi de… | `mt-funcoes` | — |
| O lucro máximo que a barraquinha pode alcançar é de… | `mt-funcoes` | — |
| Após 6 horas, a população dessa cultura será de… | `mt-funcoes` | — |

- **PROBLEMA:** SVG com min-w-[320px] e a demo era exibida também para geometria analítica sem recorte; em 360 px causa rolagem lateral; comparação `delta === 0` com ponto flutuante.
  - **Correção:** SVG responsivo (escala pelo viewBox, sem min-width); delta com tolerância; vínculo por subtópicos afim/quadrática + reta.

<details><summary>Textos e fórmulas exibidos (36 trechos extraídos do código)</summary>

- , mode === value ?
- ; import { cn } from
- ; import { Slider } from
- ; type Mode =
- ), points: visible }; }, [a, b, c, isAfim]); const equation = isAfim ?
- ); continue; } steps.push(
- ], ] as const ).map(([value, label]) => ( <button key={value} role=
- } </label> <Slider value={[a]} onValueChange={([v]) => setA(v)} min={-3} max={3} step={0.1} aria-label=
- } </p> </div> </div> </div> ); } function format(n: number): string { const rounded = Math.round(n * 10) / 10; return rounded.toString().replace(
- } > {/* grid */} {Array.from({ length: 21 }, (_, i) => { const x = X_MIN + i; return ( <line key={
- } x={toSvgX(0) - 8} y={toSvgY(n) + 3} fontSize=
- } x={toSvgX(n)} y={toSvgY(0) + 14} fontSize=
- } x1={0} y1={toSvgY(y)} x2={W} y2={toSvgY(y)} stroke=
- } x1={toSvgX(x)} y1={0} x2={toSvgX(x)} y2={H} stroke=
- /> </div> ) : null} <p className=
- /> </div> {!isAfim ? ( <div> <label className=
- /> </div> <div> <label className=
- /> <defs> <linearGradient id=
- /> <stop offset=
- > {equation} </p> <div> <label className=
- > {isAfim ?
- > {n} </text> ))} {[-10, -5, 5, 10].map((n) => ( <text key={
- > {n} </text> ))} {/* curve */} <path d={path} fill=
- > {p.label} </text> </g> ))} </svg> </div> <div className=
- > <div role=
- > <p className=
- > <stop offset=
- > a = <strong className=
- > b = <strong className=
- > c = <strong className=
- >{format(a)}</strong> {!isAfim && Math.abs(a) < 0.01 ?
- >{format(b)}</strong> </label> <Slider value={[b]} onValueChange={([v]) => setB(v)} min={-10} max={10} step={0.5} aria-label=
- >{format(c)}</strong> </label> <Slider value={[c]} onValueChange={([v]) => setC(v)} min={-10} max={10} step={0.5} aria-label=
- className=
- fill=
- h-auto w-full min-w-[320px] rounded-xl bg-muted/20

</details>

### `genetica`

- **Arquivo:** `src/components/demos/genetica-demo.tsx`
- **Área:** cn
- **Vinculada a (tópico):** `cn-genetica`
- **Questões seed que exibem:** 2

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| A proporção esperada de plantas com flores BRANCAS na descendência é d… | `cn-genetica` | — |
| A probabilidade de um filho desse casal ser do grupo O é de… | `cn-genetica` | — |

- **PROBLEMA:** Granularidade: o quadro de Punnett (1 alelo, dominância V/v) era exibido na questão do sistema ABO (alelos múltiplos e co-dominância) — conceito diferente.
  - **Correção:** Vinculada só ao subtópico de cruzamentos monohíbridos (cn-genetica.cruzamentos); ABO fica sem demo.

<details><summary>Textos e fórmulas exibidos (36 trechos extraídos do código)</summary>

- , phenotype(g) ===
- , value === g ?
- ; const GENOTYPES: Cross[] = [
- ; import { cn } from
- ; import { motion, useReducedMotion } from
- ; type Cross =
- ; type Genotype =
- : parentA ===
- ? -1 : 1)); return pair.join(
- ) ?? 0; const red = 4 - white; return ( <div className=
- ) as Genotype; }), ); } function phenotype(g: Genotype):
- ) as string[]; const gametesB = b.split(
- ) as string[]; return gametesA.flatMap((ga) => gametesB.map((gb) => { const pair = [ga, gb].sort((x, y) => (x === y ? 0 : x ===
- ); const [parentB, setParentB] = useState<Cross>(
- ); const reduced = useReducedMotion(); const grid = cross(parentA, parentB); const counts = new Map<Genotype, number>(); for (const g of grid) counts.set(g, (counts.get(g) ?? 0) + 1); const white = counts.get(
- ).map((_gb, j) => { const g = grid[i * 2 + j]; return ( <motion.td key={j} className={cn(
- ).map((g, i) => ( <th key={i} className=
- ).map((ga, i) => ( <tr key={i}> <th className=
- ]; function cross(a: Cross, b: Cross): Genotype[] { const gametesA = a.split(
- { return g.includes(
- } </p> </section> </div> ); } function ParentPicker({ label, value, onChange, }: { label: string; value: Cross; onChange: (v: Cross) => void; }) { return ( <div className=
- /> {parentB.split(
- && parentB ===
- > {g} </th> ))} </tr> </thead> <tbody> {parentA.split(
- > {GENOTYPES.map((g) => ( <button key={g} role=
- > <h3 className=
- > <p className=
- > <ParentPicker label=
- > <section aria-label=
- > <table className=
- > <thead> <tr> <th className=
- > Escolha os genótipos dos pais (V = vermelha dominante, v = branca) </h3> <div className=
- >{ga}</th> {parentB.split(
- >{label}</p> <div role=
- >×</span> <ParentPicker label=
- || parentB ===

</details>

### `geometria`

- **Arquivo:** `src/components/demos/geometria-demo.tsx`
- **Área:** mt
- **Vinculada a (tópico):** `mt-geometria-plana`, `mt-geometria-espacial`
- **Questões seed que exibem:** 2

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| O valor total do terreno é de… | `mt-geometria-plana` | — |
| A altura em que a escada toca a parede é de… | `mt-geometria-plana` | — |

- **PROBLEMA:** Vinculada a geometria espacial (volumes), mas a demo é de áreas/perímetros planos.
  - **Correção:** Vinculada só a mt-geometria-plana.areas-perimetros; espacial fica sem demo.

<details><summary>Textos e fórmulas exibidos (35 trechos extraídos do código)</summary>

- ; import { motion, useReducedMotion } from
- ; import { Slider } from
- } > <span className=
- /> </div> <div className=
- /> </div> <div> <label className=
- /> <rect x={20 + (180 - cornerW * 30)} y=
- /> <text x=
- > {height} m </span> </motion.div> </div> <div className=
- > {width} m </span> <span className=
- > <div className=
- > <div> <label className=
- > <h3 className=
- > <motion.div className=
- > <p className=
- > <rect x=
- > <section aria-label=
- > <svg width=
- > −{cornerW}×{cornerH} </text> </svg> <div className=
- > Altura: <strong className=
- > Área em L = {area} − {cornerW * cornerH} = {lArea} m² </p> <p className=
- > Aumente um lado e veja quem cresce mais rápido: perímetro ou área? </h3> <div className=
- > Figura em L = retângulo grande − recorte (decomposição) </h3> <div className=
- > Largura: <strong className=
- >{area} m²</p> </div> </div> </div> </div> </section> <section aria-label=
- >{height} m</strong> </label> <Slider value={[height]} onValueChange={([v]) => setHeight(v)} min={1} max={6} step={1} aria-label=
- >{perimeter} m</p> </div> <div className=
- >{width} m</strong> </label> <Slider value={[width]} onValueChange={([v]) => setWidth(v)} min={1} max={8} step={1} aria-label=
- >Área</p> <p className=
- >Perímetro</p> <p className=
- fill=
- opacity=
- stroke=
- strokeDasharray=
- style={{ width: Math.max(30, width * scale), height: Math.max(30, height * scale), }} animate={reduced ? undefined : { scale: 1 }} role=
- width={cornerW * 30} height={cornerH * 30} rx=

</details>

### `linha-tempo`

- **Arquivo:** `src/components/demos/linha-tempo-demo.tsx`
- **Área:** lc, ch
- **Vinculada a (tópico):** `lc-literatura-movimentos`, `ch-brasil-colonia`, `ch-brasil-imperio`, `ch-brasil-republica`, `ch-historia-geral`
- **Questões seed que exibem:** 1

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| O conjunto de medidas do período descrito evidencia… | `ch-brasil-republica` | — |

- **PROBLEMA:** Agrupa assuntos: a linha do tempo é de MOVIMENTOS LITERÁRIOS brasileiros, mas era vinculada a 4 tópicos de História (colônia, império, república, história geral). Questão da Era Vargas exibia eras literárias.
  - **Correção:** Vinculada só a lc-literatura-movimentos.movimentos; tópicos de História ficam sem demo.

<details><summary>Textos e fórmulas exibidos (23 trechos extraídos do código)</summary>

- , }, { period:
- , name:
- , selected === i ?
- , summary:
- ; import { cn } from
- ; import { motion, useReducedMotion } from
- ; interface Era { period: string; name: string; summary: string; } const TIMELINE: Era[] = [ { period:
- } <span className=
- } > <motion.span className={cn(
- /> ) : null} <span className=
- > ({TIMELINE[selected].period}) </span> </p> <p className=
- > {era.name} </span> </div> ))} </div> </div> {selected !== null ? ( <motion.div className=
- > {TIMELINE.map((era, i) => ( <div key={era.name} role=
- > {TIMELINE[selected].name}{
- > <button onClick={() => setSelected(selected === i ? null : i)} className=
- > <div className=
- > <h3 className=
- > <p className=
- > Linha do tempo da literatura brasileira — toque em um marco </h3> <div className=
- >{TIMELINE[selected].summary}</p> </motion.div> ) : ( <p className=
- carpe diem
- className=
- initial={reduced ? undefined : { opacity: 0, y: 8 }} animate={reduced ? undefined : { opacity: 1, y: 0 }} role=

</details>

### `mapas`

- **Arquivo:** `src/components/demos/mapas-demo.tsx`
- **Área:** ch
- **Vinculada a (tópico):** `ch-geo-fisica`, `ch-geo-humana`, `ch-cartografia`, `ch-meio-ambiente`
- **Questões seed que exibem:** 1

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| A ação humana que mais diretamente reduziria as emissões de CO₂ ligada… | `ch-meio-ambiente` | — |

- **PROBLEMA:** Agrupa assuntos: gráfico de população por região era vinculado a geo-física, cartografia e meio-ambiente (a questão de emissões de CO₂ exibia população do Censo). Dados do Censo 2022 imprecisos (Sul 30,4 mi e shares somando 100,4%).
  - **Correção:** Vinculada só a ch-geo-humana.populacao; dados corrigidos pelo Censo 2022 (Sul 29,2 mi; shares somam 100,0%).

<details><summary>Textos e fórmulas exibidos (35 trechos extraídos do código)</summary>

- , )} > {ind.label} </button> ))} </div> </div> <div className=
- , border:
- , borderRadius: 12, fontSize: 12, }} /> <Bar dataKey=
- , indicator === ind.key ?
- , population: 17.9, share: 8.5, color:
- , population: 30.4, share: 14.4, color:
- , population: 57.1, share: 27.1, color:
- , population: 89.6, share: 42.5, color:
- ; /** * Geography data explorer: Brazil regions with a choropleth-style list and * live chart (IBGE-style open data, simplified for study purposes). */ const REGIONS = [ { id:
- ; import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from
- ; import { cn } from
- ; import { motion, useReducedMotion } from
- ]} contentStyle={{ background:
- } </span> </motion.button> ))} </div> </div> <p className=
- }, ] as const; export function MapasDemo() { const [indicator, setIndicator] = useState<
- }, ]; const INDICATORS = [ { key:
- }} /> <Tooltip formatter={(value: number) => [
- }} /> <YAxis tick={{ fontSize: 11, fill:
- /> {r.name} </span> <span className=
- % da população do Brasil
- > {activeRegion ?
- > {INDICATORS.map((ind) => ( <button key={ind.key} role=
- > {r[indicator]}{indicator ===
- > <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}> <CartesianGrid stroke=
- > <div className=
- > <h3 className=
- > <ResponsiveContainer width=
- > Regiões do Brasil por população (Censo 2022, IBGE) </h3> <div role=
- Centro-Oeste
- className=
- População (milhões)
- population
- strokeDasharray=
- tick={{ fontSize: 11, fill:
- vertical={false} /> <XAxis dataKey=

</details>

### `phet`

- **Arquivo:** `src/components/demos/phet-demo.tsx`
- **Área:** cn
- **Vinculada a (tópico):** `cn-mecanica`, `cn-energia-trabalho`, `cn-ondas-optica`, `cn-eletricidade`
- **Questões seed que exibem:** 1

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| O custo mensal (30 dias) aproximado para operar esse chuveiro é de… | `cn-eletricidade` | — |

- **PROBLEMA:** Agrupa assuntos: uma única demo com 3 simulações em abas abria SEMPRE na aba 'Movimento' — a questão do chuveiro elétrico (circuitos) exibia a de movimento. Título com erro de digitação ('Movimento ( Energia de um Skate)').
  - **Correção:** Aceita parâmetro da questão (subtópico → aba inicial: circuits/waves/motion); título corrigido.

<details><summary>Textos e fórmulas exibidos (20 trechos extraídos do código)</summary>

- , questions: [
- , title:
- , url:
- ; /** * PhET simulations embedded from the official site (CC BY, University of * Colorado Boulder) with guiding questions beside each (doc section 12). */ const SIMULATIONS = [ { id:
- ); const sim = SIMULATIONS.find((s) => s.id === active) ?? SIMULATIONS[0]; return ( <div className=
- } > {s.title} </button> ))} </div> <div className=
- } className=
- > {sim.questions.map((q) => ( <li key={q}>{q}</li> ))} </ul> </aside> </div> <p className=
- > {SIMULATIONS.map((s) => ( <button key={s.id} role=
- > <div className=
- > <div role=
- > <iframe key={sim.url} src={sim.url} title={
- > <p className=
- > Enquanto brinca, pergunte-se </p> <ul className=
- allowFullScreen /> </div> <aside className=
- Amplitude maior muda o SOM como?
- Aumente a tensão da pilha: o que muda na corrente?
- className=
- loading=
- O que acontece com a altura máxima quando atrito é ligado?

</details>

### `porcentagem`

- **Arquivo:** `src/components/demos/porcentagem-demo.tsx`
- **Área:** mt
- **Vinculada a (tópico):** `mt-porcentagem-juros`
- **Questões seed que exibem:** 6

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| Comparando os preços finais à vista nas duas lojas, conclui-se que… | `mt-porcentagem-juros` | — |
| O preço de um produto passou de R$ 80,00 para R$ 92,00. A variação per… | `mt-porcentagem-juros` | — |
| Após 5 meses de aplicação, o total de juros recebidos, em reais, será … | `mt-porcentagem-juros` | — |
| A diferença entre os montantes finais dos dois investimentos, em reais… | `mt-porcentagem-juros` | — |
| O número de alunos que NÃO participam da oficina de robótica é… | `mt-porcentagem-juros` | — |
| Após uma alta de 25%, o preço de um produto passou a ser maior que o o… | `mt-porcentagem-juros` | — |

<details><summary>Textos e fórmulas exibidos (36 trechos extraídos do código)</summary>

- , )} > variação líquida: {netChange > 0 ?
- , netChange > 0 ?
- , on ?
- ; import { cn } from
- ; import { motion, useReducedMotion } from
- ; import { Slider } from
- ; import { TrendingDown, TrendingUp } from
- : netChange < 0 ?
- )} </label> <Slider id=
- )} </span> </p> <p className=
- )} </span> </p> <p className={cn(
- } {Math.abs(increase - discount) < 100 && netChange !== increase - discount ?
- } {netChange.toFixed(1).replace(
- } > {Array.from({ length: TOTAL_BLOCKS }, (_, i) => { const on = i < filled; return ( <motion.span key={i} className={cn(
- /> </div> <div className=
- /> <div className=
- /> <label htmlFor=
- /> Aumento: {increase}% </label> <Slider id=
- /> Desconto depois: {discount}% </label> <Slider id=
- > {/* Part 1: blocks */} <section aria-label=
- > {percent} blocos </span> </div> <div className=
- > <div className=
- > <h3 className=
- > <label htmlFor=
- > <p className=
- > <span className=
- > <span>0%</span> <span className=
- > <TrendingDown className=
- > <TrendingUp className=
- > após +{increase}% </span> <span className=
- > Aumento e depois desconto <span className=
- > Quantos são {percent}% de 100? </h3> <span className=
- > R$ {finalValue.toFixed(2).replace(
- > R$ {startValue.toLocaleString(
- > R$ {valueAfterIncrease.toFixed(2).replace(
- > Valor inicial: R$ {startValue.toLocaleString(

</details>

### `probabilidade`

- **Arquivo:** `src/components/demos/probabilidade-demo.tsx`
- **Área:** mt
- **Vinculada a (tópico):** `mt-probabilidade`, `mt-combinatoria`
- **Questões seed que exibem:** 4

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| A probabilidade de a bola retirada ser vermelha é… | `mt-probabilidade` | — |
| A probabilidade de a soma dos pontos ser igual a 7 é… | `mt-probabilidade` | — |
| Uma moeda honesta é lançada 3 vezes seguidas. A probabilidade de apare… | `mt-probabilidade` | — |
| O total de senhas diferentes possíveis é… | `mt-combinatoria` | — |

- **PROBLEMA:** Agrupa assuntos: vinculada a mt-probabilidade E mt-combinatoria. A questão de senhas (princípio multiplicativo — contagem) exibia a árvore de probabilidades, que não ensina contagem.
  - **Correção:** Vinculação passou a ser por subtópico: apenas eventos compostos (mt-probabilidade.eventos-compostos); combinatoria fica sem demo.
- **PROBLEMA:** SVG com min-w-[480px] — rolagem lateral em telas de 360 px.
  - **Correção:** SVG responsivo sem min-width.

<details><summary>Textos e fórmulas exibidos (30 trechos extraídos do código)</summary>

- , prob: (1 - p) * (1 - p) }, ]; const atLeastOneA = 1 - paths[3].prob; return ( <div className=
- , prob: (1 - p) * p }, { key:
- , prob: p * (1 - p) }, { key:
- , prob: p * p }, { key:
- ; import { motion, useReducedMotion } from
- ? 4 : 2} /> <line x1=
- ? 4 : 2} /> <text x=
- ) </span> <span className=
- )}% </span> </p> </div> <p className=
- )}% </span> </p> <p className=
- )}% </text> </g> ))} </svg> </div> <div className=
- } > {/* stage 1 */} <line x1=
- }} > <motion.circle cx={330} cy={[40, 105, 155, 220][i]} r={8} fill={hoverPath === path.key ?
- /> <strong className=
- > {(atLeastOneA * 100).toFixed(1).replace(
- > {(paths.reduce((s, x) => s + x.prob, 0) * 100).toFixed(1).replace(
- > <div className=
- > <h3 className=
- > <p className=
- > <section aria-label=
- > <span className=
- > <svg viewBox=
- > Duas etapas: a chance de cada caminho se multiplica </h3> <label className=
- > P(A) por etapa: <input type=
- > Pelo menos um A (complementar do
- >{pA}%</strong> </label> </div> <div className=
- >Soma dos 4 caminhos (tem que dar 100%)</span> <span className=
- className=
- min={5} max={95} value={pA} onChange={(e) => setPA(Number(e.target.value))} className=
- role=

</details>

### `razao-proporcao`

- **Arquivo:** `src/components/demos/razao-proporcao-demo.tsx`
- **Área:** mt
- **Vinculada a (tópico):** `mt-razao-proporcao`
- **Questões seed que exibem:** 3

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| A distância real entre as duas cidades é de… | `mt-razao-proporcao` | — |
| Com 8 operários trabalhando no mesmo ritmo, a obra ficará pronta em… | `mt-razao-proporcao` | — |
| O gasto estimado apenas com gasolina para a viagem será de… | `mt-razao-proporcao` | — |

- **PROBLEMA:** Mistura áreas e assuntos: contém uma ALAVANCA (conceito de FÍSICA — torque) dentro de uma demo de MATEMÁTICA, além de uma tabela de regra de três fixa com arroz (texto estático, não calculado pelos controles). Nada disso ensina ESCALA DE MAPA — mas a questão de escala (4,5 cm, 1:200.000) exibia exatamente esta demo.
  - **Correção:** Separar em demos independentes: razao, regra-de-tres (calculada), escala-mapa (nova) e alavanca (física, vinculada só a Física). Demo razao-proporcao removida.
- **PROBLEMA:** Matemática quebrada: `rightDistance` é SEMPRE recalculado para igualar o torque esquerdo (o equilíbrio é automático e trivial), e `balanced` compara DISTÂNCIAS em vez de TORQUES. Com 3 kg × 4 m = 6 kg × 2 m (torques iguais = 12), a barra aparece INCLINADA — a animação contradiz o texto.
  - **Correção:** Demo descontinuada; a nova alavanca calcula torque dos dois lados e só fica horizontal quando os torques são iguais (testado: 3×4 = 6×2 ⇒ inclinação 0°).

<details><summary>Textos e fórmulas exibidos (29 trechos extraídos do código)</summary>

- , balanced ?
- , stiffness: 120, damping: 12 }} > {leftWeight} kg </motion.span> <span className=
- , stiffness: 120, damping: 12 }} > {rightWeight} kg </motion.span> <span className=
- , stiffness: 120, damping: 12 }} > <span className=
- ; import { cn } from
- ; import { motion, useReducedMotion } from
- ; import { Slider } from
- )} </td> </tr> </tbody> </table> </div> <p className=
- } {rightWeight} kg × {format(rightDistance)} m = {format(leftWeight * rightDistance)} </p> <div className=
- /> </motion.div> <div className=
- > {/* Balance */} <section aria-label=
- > {leftWeight} kg × {format(leftDistance)} m = {format(leftTorque)} · {
- > <div className=
- > <h3 className=
- > <motion.span className=
- > A balança equilibra quando peso × distância é igual dos dois lados </h3> <p className=
- > A proporção se mantém: o preço por quilo é sempre 21 ÷ 3 = R$ 7. </p> </section> </div> ); } function format(n: number): string { return (Math.round(n * 10) / 10).toString().replace(
- >{format(leftDistance)} m</span> </div> <motion.div className=
- >{format(rightDistance)} m</span> </div> </div> <p className={cn(
- animate={{ rotate: -tilt }} transition={reduced ? { duration: 0 } : { type:
- animate={{ y: -tilt }} transition={reduced ? { duration: 0 } : { type:
- animate={{ y: tilt }} transition={reduced ? { duration: 0 } : { type:
- Distância do lado esquerdo
- Equilibrada! A distância do lado direito se ajusta sozinha pela proporção.
- Para equilibrar com ${rightWeight} kg, a distância certa é ${format(rightDistance)} m.
- Peso do lado direito
- Peso do lado esquerdo
- Regra de três
- w-full text-sm

</details>

### `textos`

- **Arquivo:** `src/components/demos/textos-demo.tsx`
- **Área:** lc
- **Vinculada a (tópico):** `lc-interpretacao`, `lc-generos-tipos`, `lc-variacao-linguistica`, `lc-figuras-linguagem`
- **Questões seed que exibem:** 2

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| Pela construção do texto, conclui-se que o narrador critica… | `lc-interpretacao` | — |
| Comparando as duas falas, a mudança de registro linguístico da neta oc… | `lc-variacao-linguistica` | — |

- **PROBLEMA:** Agrupa assuntos: vinculada a 4 tópicos de Linguagens, incluindo gêneros textuais e variação linguística, que a anotação de figuras/funções não ensina. Além disso a explicação da ironia contém frase truncada ('na pasta com a realidade').
  - **Correção:** Vinculada só a lc-interpretacao.interpretacao e lc-figuras-linguagem.figuras; texto da ironia reescrito.

<details><summary>Textos e fórmulas exibidos (28 trechos extraídos do código)</summary>

- , )} aria-label=
- , }, { id: 3, text:
- , }, { id: 4, text:
- , active ?
- , concept:
- , explanation:
- ; import { cn } from
- : identificação direta entre dois elementos de mundos diferentes.
- } <Mark active={open === 1} onClick={() => setOpen(open === 1 ? null : 1)} /> —{
- } <Mark active={open === 2} onClick={() => setOpen(open === 2 ? null : 2)} />,{
- } <Mark active={open === 3} onClick={() => setOpen(open === 3 ? null : 3)} />, na sua relação com o celular, é o aplicativo:{
- } <Mark active={open === 4} onClick={() => setOpen(open === 4 ? null : 4)} />{
- } acaba escravizando seus usuários. </blockquote> {open !== null ? ( <div className=
- } e ele é acionado{
- } enquanto{
- && onClick()} className={cn(
- > “{FRAGMENTS.find((f) => f.id === open)?.text}” </p> </div> ) : ( <p className=
- > {FRAGMENTS.find((f) => f.id === open)?.concept} </p> <p className=
- > {FRAGMENTS.find((f) => f.id === open)?.explanation} </p> <p className=
- > <h3 className=
- > <p className=
- > Cada trecho colorido esconde uma figura de linguagem ou função do texto. </p> )} </div> ); } function Mark({ active, onClick }: { active: boolean; onClick: () => void }) { return ( <span role=
- > Quem manda mesmo{
- > Toque nos trechos destacados para revelar o conceito de linguagem </h3> <blockquote className=
- a notificação de celular é um chicote silencioso
- bilhões de vezes por dia
- na pasta com a realidade descrita cria um contraste crítico: dizemos uma coisa para significar a oposta.
- tabIndex={0} onClick={onClick} onKeyDown={(e) => e.key ===

</details>

## Problemas estruturais detectados

- ⚠️ `funcoes` vinculada a 2 assuntos (mt-funcoes, mt-geometria-analitica) — agrupamento; o vínculo deve ser por subtópico.
- ⚠️ `divisao` vinculada a 2 assuntos (mt-operacoes-basicas, mt-divisibilidade) — agrupamento; o vínculo deve ser por subtópico.
- ⚠️ `probabilidade` vinculada a 2 assuntos (mt-probabilidade, mt-combinatoria) — agrupamento; o vínculo deve ser por subtópico.
- ⚠️ `estatistica` vinculada a 2 assuntos (mt-estatistica, mt-graficos-tabelas) — agrupamento; o vínculo deve ser por subtópico.
- ⚠️ `balanceamento` vinculada a 2 assuntos (cn-estequiometria, cn-equilibrio-eletroquimica) — agrupamento; o vínculo deve ser por subtópico.
- ⚠️ `phet` vinculada a 4 assuntos (cn-mecanica, cn-energia-trabalho, cn-ondas-optica, cn-eletricidade) — agrupamento; o vínculo deve ser por subtópico.
- ⚠️ `textos` vinculada a 4 assuntos (lc-interpretacao, lc-generos-tipos, lc-variacao-linguistica, lc-figuras-linguagem) — agrupamento; o vínculo deve ser por subtópico.
- ⚠️ `linha-tempo` vinculada a 5 assuntos (lc-literatura-movimentos, ch-brasil-colonia, ch-brasil-imperio, ch-brasil-republica, ch-historia-geral) — agrupamento; o vínculo deve ser por subtópico.
- ⚠️ `linha-tempo` mistura áreas: lc, ch (via lc-literatura-movimentos, ch-brasil-colonia, ch-brasil-imperio, ch-brasil-republica, ch-historia-geral).
- ⚠️ `geometria` vinculada a 2 assuntos (mt-geometria-plana, mt-geometria-espacial) — agrupamento; o vínculo deve ser por subtópico.
- ⚠️ `mapas` vinculada a 4 assuntos (ch-geo-fisica, ch-geo-humana, ch-cartografia, ch-meio-ambiente) — agrupamento; o vínculo deve ser por subtópico.

## Vínculo atual (fonte da verdade: `src/components/demos/registry.ts` + `src/lib/demos/subtopics.ts`)

Vínculo por TÓPICO (demoTopicBindings) — causa raiz do bug da demo desligada. O PASSO 2 substitui por vínculo por SUBTÓPICO (granularidade fina).
