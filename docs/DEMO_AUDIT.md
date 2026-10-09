# DEMO_AUDIT.md — Auditoria dos simuladores interativos

Gerado por `scripts/audit-demos.ts` em 2026-10-09 · vínculo por **subtópico** · 18 simuladores · 35 questões seed · 22 questões com demo no estado atual.

> Regra permanente (docs/DECISIONS.md): nenhum simulador novo pode ser criado sem (1) vínculo a um subtópico, (2) testes numéricos e (3) entrada neste documento. Demo errada é pior que nenhuma demo.

## Visão geral

| Simulador | Arquivo | Área | Vínculo | Questões que exibem | Status |
| --- | --- | --- | --- | --- | --- |
| `alavanca` | src/components/demos/alavanca-demo.tsx | cn | `cn-mecanica.alavanca` | 0 | OK |
| `balanceamento` | src/components/demos/balanceamento-demo.tsx | cn | `cn-estequiometria.balanceamento`<br>`cn-estequiometria.calculos-estequiometricos` | 1 | ⚠️ 1 problema(s) |
| `divisao` | src/components/demos/divisao-demo.tsx | mt | `mt-divisibilidade.criterios`<br>`mt-operacoes-basicas.multiplicacao-divisao` | 0 | OK |
| `escala-mapa` | src/components/demos/escala-mapa-demo.tsx | mt | `mt-razao-proporcao.escala` | 1 | OK |
| `estatistica` | src/components/demos/estatistica-demo.tsx | mt | `mt-estatistica.media-mediana-moda` | 2 | ⚠️ 1 problema(s) |
| `eutrofizacao` | src/components/demos/eutrofizacao-demo.tsx | cn | `cn-ecologia.eutrofizacao` | 1 | OK |
| `fracoes` | src/components/demos/fracoes-demo.tsx | mt | `mt-fracoes-decimais.fracoes` | 2 | OK |
| `funcoes` | src/components/demos/funcoes-demo.tsx | mt | `mt-funcoes.afim`<br>`mt-funcoes.quadratica`<br>`mt-geometria-analitica.reta` | 2 | ⚠️ 1 problema(s) |
| `genetica` | src/components/demos/genetica-demo.tsx | cn | `cn-genetica.cruzamentos` | 1 | OK |
| `geometria` | src/components/demos/geometria-demo.tsx | mt | `mt-geometria-plana.areas-perimetros` | 1 | OK |
| `linha-tempo` | src/components/demos/linha-tempo-demo.tsx | lc | `lc-literatura-movimentos.movimentos` | 0 | OK |
| `mapas` | src/components/demos/mapas-demo.tsx | ch | `ch-geo-humana.populacao` | 0 | ⚠️ 1 problema(s) |
| `phet` | src/components/demos/phet-demo.tsx | cn | `cn-eletricidade.circuitos`<br>`cn-eletricidade.potencia-eletrica`<br>`cn-energia-trabalho.fontes-transformacoes`<br>`cn-mecanica.energia-mecanica`<br>`cn-ondas-optica.ondas` | 1 | ⚠️ 1 problema(s) |
| `porcentagem` | src/components/demos/porcentagem-demo.tsx | mt | `mt-porcentagem-juros.juros-compostos`<br>`mt-porcentagem-juros.porcentagem`<br>`mt-porcentagem-juros.variacoes-sucessivas` | 5 | OK |
| `probabilidade` | src/components/demos/probabilidade-demo.tsx | mt | `mt-probabilidade.eventos-compostos` | 2 | ⚠️ 1 problema(s) |
| `razao` | src/components/demos/razao-demo.tsx | mt | `mt-razao-proporcao.proporcao`<br>`mt-razao-proporcao.razao` | 0 | OK |
| `regra-de-tres` | src/components/demos/regra-de-tres-demo.tsx | mt | `mt-razao-proporcao.regra-de-tres-direta`<br>`mt-razao-proporcao.regra-de-tres-inversa` | 2 | OK |
| `textos` | src/components/demos/textos-demo.tsx | lc | `lc-figuras-linguagem.figuras`<br>`lc-interpretacao.interpretacao` | 1 | ⚠️ 1 problema(s) |

## Detalhe por simulador

### `alavanca`

- **Arquivo:** `src/components/demos/alavanca-demo.tsx`
- **Área:** cn
- **Vinculada a (subtópicos):** `cn-mecanica.alavanca`
- **Questões seed que exibem:** 0

<details><summary>Textos e fórmulas exibidos (36 trechos extraídos do código)</summary>

- , )} > {mass} kg </span> <span className=
- , side ===
- , state.balanced ?
- , stiffness: 120, damping: 14 }} > {/* marcas de distância (1 m a 6 m de cada lado) */} {Array.from({ length: MAX_DISTANCE }, (_, i) => i + 1).map((m) => ( <span key={
- , transformOrigin:
- ; import { cn } from
- ; import { leverState } from
- ; import { motion, useReducedMotion } from
- ; import { Slider } from
- ; mass: number; distance: number; rotation: number; }) { const px = distToPx(distance); const left = side ===
- ? -state.tiltDeg : state.tiltDeg; return ( <div className=
- )} graus para o lado ${state.heavierSide ===
- } {fmt(rightDistance)} m = <strong>{fmt(state.rightTorque)} kg·m</strong> </p> <div className=
- } </p> <div className=
- } <strong>{fmt(state.leftTorque)} kg·m</strong> · Direita: {rightMass} kg ×{
- } > {/* apoio (fulcro) */} <div className=
- } className=
- } contra <span className=
- } é maior, e a barra pende para esse lado (${state.tiltDeg.toFixed(1).replace(
- }} animate={{ rotate: barRotation }} transition={reduced ? { duration: 0 } : { type:
- }} aria-hidden=
- /> ))} {Array.from({ length: MAX_DISTANCE }, (_, i) => i + 1).map((m) => ( <span key={
- /> ))} <Pan side=
- /> {/* prato com o peso */} <span className={cn(
- /> </div> {/* barra que gira em torno do centro (apoio) */} <motion.div className=
- /> </div> </div> </section> <section aria-label=
- /> </div> <div> <label htmlFor=
- /> <div className=
- /> <label htmlFor=
- > <div className=
- > <div> <label htmlFor=
- > <h3 className=
- > <section aria-label=
- > A alavanca equilibra quando os torques (peso × distância) são iguais </h3> <p className=
- > Distância direita: <strong className=
- > Distância esquerda: <strong className=

</details>

### `balanceamento`

- **Arquivo:** `src/components/demos/balanceamento-demo.tsx`
- **Área:** cn
- **Vinculada a (subtópicos):** `cn-estequiometria.balanceamento`, `cn-estequiometria.calculos-estequiometricos`
- **Questões seed que exibem:** 1

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| A massa de água produzida na reação completa de 8 g de hidrogênio (H₂)… | `cn-estequiometria` | `calculos-estequiometricos` |

- **CORRIGIDO:** Vinculada a cn-equilibrio-eletroquimica, mas a demo é o balanceamento molecular H₂+O₂→H₂O, sem relação com equilíbrio químico/eletroquímica.
  - **Correção:** Vinculada a cn-estequiometria.balanceamento e cn-estequiometria.calculos-estequiometricos (a equação balanceada é o passo 0 do cálculo).
- **PROBLEMA:** O botão do coeficiente DECREMENTA ao ser clicado (confuso: parece seletor, é ação).
  - **Correção:** Botão vira exibição passiva (correção do PASSO 3).

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
- **Vinculada a (subtópicos):** `mt-divisibilidade.criterios`, `mt-operacoes-basicas.multiplicacao-divisao`
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

### `escala-mapa`

- **Arquivo:** `src/components/demos/escala-mapa-demo.tsx`
- **Área:** mt
- **Vinculada a (subtópicos):** `mt-razao-proporcao.escala`
- **Questões seed que exibem:** 1

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| A distância real entre as duas cidades é de… | `mt-razao-proporcao` | `escala` |

<details><summary>Textos e fórmulas exibidos (36 trechos extraídos do código)</summary>

- , { minimumFractionDigits: 0, maximumFractionDigits: digits, }); } function fmtInt(n: number): string { return Math.round(n).toLocaleString(
- , step >= 1 ?
- , step >= 2 ?
- , step >= 3 ?
- ; import { cn, } from
- ; import { convertMapScale, MAP_SCALE_DENOMINATORS, CM_PER_KM, type MapScaleConversion, } from
- ; import { motion, useReducedMotion } from
- ; import { Slider } from
- ? params.distanceCm : 4.5; const askedScale = typeof params?.scale ===
- ); } export function EscalaMapaDemo({ params }: { params?: EscalaMapaParams }) { const askedDistance = typeof params?.distanceCm ===
- )} × {fmtInt(scale)} = {fmtInt(conv.realCm)} cm </span> </li> <li className={cn(
- )} centímetros no papel.
- )} cm no mapa </text> {/* régua embaixo */} <g> <line x1=
- )} cm no mapa, na escala ${scaleLabel}, correspondem a ${fmt(conv.realKm, 2).replace(
- )} cm</strong> </label> <Slider id=
- )} km </span> </li> </ol> <p aria-live=
- )} km reais.
- )} km) </option> ))} </select> </div> </div> </section> <section aria-label=
- )} km). </p> <div className=
- /> ); })} <text x=
- /> {/* cidades */} <g> <circle cx={mapLine.x1} cy={mapLine.y} r=
- /> {/* rios e estradas decorativos */} <path d=
- /> {Array.from({ length: 12 }, (_, i) => { const x = 24 + (i * 272) / 11; return ( <line key={i} x1={x} y1=
- /> </div> <div> <label htmlFor=
- /> <path d=
- /> <rect x=
- /> <text x={mapLine.x1} y={mapLine.y - 12} fontSize=
- /> <text x={mapLine.x2} y={mapLine.y - 12} fontSize=
- > {fmt(distanceCm, 1).replace(
- > {MAP_SCALE_DENOMINATORS.map((d) => ( <option key={d} value={d}> 1:{fmtInt(d)} &nbsp;(1 cm = {fmt(d / CM_PER_KM, 1).replace(
- > <div> <label htmlFor=
- > <h3 className=
- > <li className={cn(
- > <section aria-label=
- > <svg viewBox=
- > Cidade Nova </text> <circle cx={mapLine.x2} cy={mapLine.y} r=

</details>

### `estatistica`

- **Arquivo:** `src/components/demos/estatistica-demo.tsx`
- **Área:** mt
- **Vinculada a (subtópicos):** `mt-estatistica.media-mediana-moda`
- **Questões seed que exibem:** 2

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| Para descrever o salário típico dos funcionários, o valor mais represe… | `mt-estatistica` | `media-mediana-moda` |
| A média mensal de empréstimos nesse período foi de… | `mt-estatistica` | `media-mediana-moda` |

- **CORRIGIDO:** Era vinculada a mt-graficos-tabelas, cujo foco é leitura de gráficos, não média/mediana/moda.
  - **Correção:** Vinculada só a mt-estatistica.media-mediana-moda.
- **PROBLEMA:** 'Adicionar aluno' sorteia nota com Math.random() (não determinístico).
  - **Correção:** Nota inicial determinística (correção de conteúdo do PASSO 3).

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
- **Vinculada a (subtópicos):** `cn-ecologia.eutrofizacao`
- **Questões seed que exibem:** 1

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| O fenômeno descrito e sua principal consequência para os peixes são, r… | `cn-ecologia` | `eutrofizacao` |

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
- **Vinculada a (subtópicos):** `mt-fracoes-decimais.fracoes`
- **Questões seed que exibem:** 2

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| A fração do tempo total planejado que ainda falta estudar é… | `mt-fracoes-decimais` | `fracoes` |
| De um total de 200 livros de uma biblioteca comunitária, $\frac{2}{5}$… | `mt-fracoes-decimais` | `fracoes` |

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
- **Vinculada a (subtópicos):** `mt-funcoes.afim`, `mt-funcoes.quadratica`, `mt-geometria-analitica.reta`
- **Questões seed que exibem:** 2

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| Se uma corrida custou R$ 35,00, a distância percorrida foi de… | `mt-funcoes` | `afim` |
| O lucro máximo que a barraquinha pode alcançar é de… | `mt-funcoes` | `quadratica` |

- **PROBLEMA:** SVG com min-w-[320px] causa rolagem lateral em telas de 360 px; comparação `delta === 0` com ponto flutuante.
  - **Correção:** SVG responsivo (escala pelo viewBox, sem min-width); delta com tolerância (correção do PASSO 3).

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
- **Vinculada a (subtópicos):** `cn-genetica.cruzamentos`
- **Questões seed que exibem:** 1

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| A proporção esperada de plantas com flores BRANCAS na descendência é d… | `cn-genetica` | `cruzamentos` |

- **CORRIGIDO:** Granularidade: o quadro de Punnett (1 alelo, dominância V/v) era exibido na questão do sistema ABO (alelos múltiplos e co-dominância) — conceito diferente.
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
- **Vinculada a (subtópicos):** `mt-geometria-plana.areas-perimetros`
- **Questões seed que exibem:** 1

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| O valor total do terreno é de… | `mt-geometria-plana` | `areas-perimetros` |

- **CORRIGIDO:** Vinculada a geometria espacial (volumes), mas a demo é de áreas/perímetros planos.
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
- **Área:** lc
- **Vinculada a (subtópicos):** `lc-literatura-movimentos.movimentos`
- **Questões seed que exibem:** 0

- **CORRIGIDO:** Agrupava assuntos: a linha do tempo é de MOVIMENTOS LITERÁRIOS brasileiros, mas era vinculada a 4 tópicos de História (colônia, império, república, história geral). Questão da Era Vargas exibia eras literárias.
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
- **Vinculada a (subtópicos):** `ch-geo-humana.populacao`
- **Questões seed que exibem:** 0

- **CORRIGIDO:** Agrupava assuntos: gráfico de população por região era vinculado a geo-física, cartografia e meio-ambiente (a questão de emissões de CO₂ exibia população do Censo).
  - **Correção:** Vinculada só a ch-geo-humana.populacao.
- **PROBLEMA:** Dados do Censo 2022 imprecisos (Sul 30,4 mi; shares somando 100,4%).
  - **Correção:** Dados corrigidos pelo Censo 2022 (SE 84,8 mi/41,8%, NE 54,6, S 29,2, N 17,0, CO 16,2 — shares calculados pelo código somam 99,5%).

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
- **Vinculada a (subtópicos):** `cn-eletricidade.circuitos`, `cn-eletricidade.potencia-eletrica`, `cn-energia-trabalho.fontes-transformacoes`, `cn-mecanica.energia-mecanica`, `cn-ondas-optica.ondas`
- **Questões seed que exibem:** 1

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| O custo mensal (30 dias) aproximado para operar esse chuveiro é de… | `cn-eletricidade` | `potencia-eletrica` |

- **PROBLEMA:** Uma única demo com 3 simulações em abas abria SEMPRE na aba 'Movimento' — a questão do chuveiro elétrico (circuitos) exibia a de movimento. Título com erro de digitação ('Movimento ( Energia de um Skate)').
  - **Correção:** Aceitar o parâmetro da questão (subtópico → aba inicial: circuits/waves/motion); título corrigido (PASSO 3).

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
- **Vinculada a (subtópicos):** `mt-porcentagem-juros.juros-compostos`, `mt-porcentagem-juros.porcentagem`, `mt-porcentagem-juros.variacoes-sucessivas`
- **Questões seed que exibem:** 5

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| Comparando os preços finais à vista nas duas lojas, conclui-se que… | `mt-porcentagem-juros` | `variacoes-sucessivas` |
| O preço de um produto passou de R$ 80,00 para R$ 92,00. A variação per… | `mt-porcentagem-juros` | `porcentagem` |
| A diferença entre os montantes finais dos dois investimentos, em reais… | `mt-porcentagem-juros` | `juros-compostos` |
| O número de alunos que NÃO participam da oficina de robótica é… | `mt-porcentagem-juros` | `porcentagem` |
| Após uma alta de 25%, o preço de um produto passou a ser maior que o o… | `mt-porcentagem-juros` | `variacoes-sucessivas` |

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
- **Vinculada a (subtópicos):** `mt-probabilidade.eventos-compostos`
- **Questões seed que exibem:** 2

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| A probabilidade de a soma dos pontos ser igual a 7 é… | `mt-probabilidade` | `eventos-compostos` |
| Uma moeda honesta é lançada 3 vezes seguidas. A probabilidade de apare… | `mt-probabilidade` | `eventos-compostos` |

- **CORRIGIDO:** Agrupava assuntos: vinculada a mt-probabilidade E mt-combinatoria. A questão de senhas (princípio multiplicativo — contagem) exibia a árvore de probabilidades, que não ensina contagem.
  - **Correção:** Vinculação por subtópico: apenas eventos compostos (mt-probabilidade.eventos-compostos); combinatoria fica sem demo.
- **PROBLEMA:** SVG com min-w-[480px] — rolagem lateral em telas de 360 px.
  - **Correção:** SVG responsivo sem min-width (correção do PASSO 3).

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

### `razao`

- **Arquivo:** `src/components/demos/razao-demo.tsx`
- **Área:** mt
- **Vinculada a (subtópicos):** `mt-razao-proporcao.proporcao`, `mt-razao-proporcao.razao`
- **Questões seed que exibem:** 0

<details><summary>Textos e fórmulas exibidos (36 trechos extraídos do código)</summary>

- , i < parts ? tone :
- , proportional ?
- ; /** * Simulador de RAZÃO E PROPORÇÃO (PASSO 2 — demo
- ; import { areProportional, ratioValue, simplifyRatio } from
- ; import { cn } from
- ; import { motion, useReducedMotion } from
- ; import { Slider } from
- } {flour} × {scaledSugar} = {flour * scaledSugar} </p> </div> <p className=
- } {ratio !== null ?
- } </p> <div className=
- } > <IngredientColumn label=
- } de açúcar para {flour} de farinha </h3> <p className=
- /> </div> </div> </section> <section aria-label=
- /> </div> <div> <label htmlFor=
- > : </span> <IngredientColumn label=
- > {Array.from({ length: max }, (_, i) => ( <motion.span key={i} className={cn(
- > {sugar} : {flour} &nbsp;=&nbsp; {scaledSugar} : {scaledFlour} </p> <p className=
- > {sugar} × {flour === 0 ?
- > <div> <label htmlFor=
- > <h3 className=
- > <p className=
- > <section aria-label=
- > A razão da receita: {sugar} parte{sugar === 1 ?
- > Açúcar (partes): <strong className=
- > Farinha (partes): <strong className=
- > Proporção: duas razões iguais </h3> <div className=
- > Razão {sugar} : {flour} {simple.b > 0 && (simple.a !== sugar || simple.b !== flour) ?
- > Receitas: <strong className=
- >{batches}×</strong> </label> <Slider id=
- >{flour}</strong> </label> <Slider id=
- >{sugar}</strong> </label> <Slider id=
- ${batches}× a receita usa ${scaledSugar} : ${scaledFlour} — a mesma proporção de ${sugar} : ${flour}.
- Ajuste os ingredientes.
- className=
- className={cn(
- O açúcar é sempre ${fmt(sugarShare)}% da mistura.

</details>

### `regra-de-tres`

- **Arquivo:** `src/components/demos/regra-de-tres-demo.tsx`
- **Área:** mt
- **Vinculada a (subtópicos):** `mt-razao-proporcao.regra-de-tres-direta`, `mt-razao-proporcao.regra-de-tres-inversa`
- **Questões seed que exibem:** 2

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| Com 8 operários trabalhando no mesmo ritmo, a obra ficará pronta em… | `mt-razao-proporcao` | `regra-de-tres-inversa` |
| O gasto estimado apenas com gasolina para a viagem será de… | `mt-razao-proporcao` | `regra-de-tres-direta` |

<details><summary>Textos e fórmulas exibidos (36 trechos extraídos do código)</summary>

- , { maximumFractionDigits: 2 }); } export function RegraDeTresDemo() { const [kind, setKind] = useState<Kind>(
- , x === null ?
- ; /** * Simulador de REGRA DE TRÊS (PASSO 2 — dividido da antiga
- ; import { cn } from
- ; import { motion, useReducedMotion } from
- ; import { ruleOfThree } from
- ; import { Slider } from
- ; interface Grandeza { name: string; unit: string; } const DIRECT: [Grandeza, Grandeza] = [ { name:
- ? ( <p className=
- ? 10 : 20} step={1} aria-label={
- ? 20 : 20} step={1} aria-label={
- ? DIRECT : INVERSE; const x = ruleOfThree(a, b, c, kind); return ( <div className=
- ); const [a, setA] = useState(3); const [b, setB] = useState(21); const [c, setC] = useState(5); const reduced = useReducedMotion(); const labels = kind ===
- ). * Tabela clássica com grandezas e valores calculados pelo código a partir * dos controles (nunca texto fixo). Modos directo e inverso. */ type Kind =
- } /> </div> </div> </section> <section aria-label=
- } /> </div> <div> <label htmlFor=
- } </p> </div> <div className=
- }, ]; const INVERSE: [Grandeza, Grandeza] = [ { name:
- }, ]; function fmt(n: number): string { return n.toLocaleString(
- }, { name:
- > {kind ===
- > {labels[0].name} (1ª): <strong className=
- > {labels[0].name} (2ª): <strong className=
- > {labels[0].name} </th> <td className=
- > {labels[1].name} (1ª): <strong className=
- > {labels[1].name} </th> <td className=
- > {x === null ?
- > {x === null ? ( <p> Valor de {labels[0].name.toLowerCase()} na 1ª situação não pode ser zero — não há proporção possível. </p> ) : kind ===
- > &nbsp; </th> <th className=
- > <div role=
- > <div> <label htmlFor=
- > <motion.div initial={reduced ? undefined : { opacity: 0, y: 6 }} animate={reduced ? undefined : { opacity: 1, y: 0 }} className=
- > <section aria-label=
- > <strong>{fmt(a)}</strong> {labels[0].unit} </td> <td className=
- > <strong>{fmt(b)}</strong> {labels[1].unit} </td> <td className=
- > <strong>{fmt(c)}</strong> {labels[0].unit} </td> </tr> <tr className=

</details>

### `textos`

- **Arquivo:** `src/components/demos/textos-demo.tsx`
- **Área:** lc
- **Vinculada a (subtópicos):** `lc-figuras-linguagem.figuras`, `lc-interpretacao.interpretacao`
- **Questões seed que exibem:** 1

| Questão (início do enunciado) | Tópico | Subtópico |
| --- | --- | --- |
| Pela construção do texto, conclui-se que o narrador critica… | `lc-interpretacao` | `interpretacao` |

- **CORRIGIDO:** Agrupava assuntos: vinculada a 4 tópicos de Linguagens, incluindo gêneros textuais e variação linguística, que a anotação de figuras/funções não ensina.
  - **Correção:** Vinculada só a lc-interpretacao.interpretacao e lc-figuras-linguagem.figuras.
- **PROBLEMA:** A explicação da ironia contém frase truncada ('na pasta com a realidade') — texto sem sentido em português.
  - **Correção:** Reescrever a explicação da ironia (correção de conteúdo do PASSO 3).

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

Nenhum: nenhuma demo atende tópicos distintos sem justificativa, nenhuma mistura áreas e nenhuma questão carrega demo de outro subtópico. Demos que atendem vários subtópicos do MESMO tópico são facetas da mesma habilidade (ex.: regra de três direta/inversa).

### Vínculos entre tópicos (justificados)
- ℹ️ `divisao` atende 2 tópicos da mesma área — justificativa: divisão com resto é a base dos critérios de divisibilidade (resto 0 ⇒ divisível) — mesma habilidade de dividir.
- ℹ️ `funcoes` atende 2 tópicos da mesma área — justificativa: afim/quadrática são abas do mesmo plotter; a reta da geometria analítica É a função afim (coeficiente angular/linear).
- ℹ️ `phet` atende 4 tópicos da mesma área — justificativa: seletor PhET: cada subtópico define a aba inicial via params.sim — o vínculo por subtópico garante a simulação certa.
- ℹ️ `textos` atende 2 tópicos da mesma área — justificativa: anotação interpretativa de um texto real: as marcações são figuras/funções de linguagem EM contexto de interpretação.

## Vínculo atual (fonte da verdade: `src/lib/demos/subtopics.ts` + `src/components/demos/registry.ts`)

```ts
alavanca: [cn-mecanica.alavanca]
balanceamento: [cn-estequiometria.balanceamento, cn-estequiometria.calculos-estequiometricos]
divisao: [mt-divisibilidade.criterios, mt-operacoes-basicas.multiplicacao-divisao]
escala-mapa: [mt-razao-proporcao.escala]
estatistica: [mt-estatistica.media-mediana-moda]
eutrofizacao: [cn-ecologia.eutrofizacao]
fracoes: [mt-fracoes-decimais.fracoes]
funcoes: [mt-funcoes.afim, mt-funcoes.quadratica, mt-geometria-analitica.reta]
genetica: [cn-genetica.cruzamentos]
geometria: [mt-geometria-plana.areas-perimetros]
linha-tempo: [lc-literatura-movimentos.movimentos]
mapas: [ch-geo-humana.populacao]
phet: [cn-eletricidade.circuitos, cn-eletricidade.potencia-eletrica, cn-energia-trabalho.fontes-transformacoes, cn-mecanica.energia-mecanica, cn-ondas-optica.ondas]
porcentagem: [mt-porcentagem-juros.juros-compostos, mt-porcentagem-juros.porcentagem, mt-porcentagem-juros.variacoes-sucessivas]
probabilidade: [mt-probabilidade.eventos-compostos]
razao: [mt-razao-proporcao.proporcao, mt-razao-proporcao.razao]
regra-de-tres: [mt-razao-proporcao.regra-de-tres-direta, mt-razao-proporcao.regra-de-tres-inversa]
textos: [lc-figuras-linguagem.figuras, lc-interpretacao.interpretacao]
```
