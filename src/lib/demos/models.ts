/**
 * Modelos numéricos puros dos simuladores (PASSO 3 da auditoria).
 *
 * REGRA: toda conta exibida por um simulador É calculada por uma função
 * deste módulo a partir dos controles — nunca texto fixo. Cada função é
 * coberta por testes unitários (tests/unit/demo-models.test.ts) com no
 * mínimo 5 valores, incluindo estados limite (0, mínimos e máximos).
 *
 * Módulo isomórfico (sem "use client" nem dependências de React/Node) para
 * poder ser importado pelos componentes, pelos testes e pelos scripts.
 */

// ===========================================================================
// escala-mapa — conversão de escala cartográfica
// ===========================================================================

/** Escalas usuais de mapas (denominador da razão 1:n). */
export const MAP_SCALE_DENOMINATORS = [25_000, 50_000, 100_000, 200_000, 500_000, 1_000_000] as const;

export const CM_PER_KM = 100_000;

export interface MapScaleConversion {
  /** distância medida no mapa (cm) */
  mapCm: number;
  /** denominador da escala (1:n ⇒ 1 cm = n cm reais) */
  denominator: number;
  /** distância real em centímetros = mapCm × n */
  realCm: number;
  /** distância real em metros */
  realM: number;
  /** distância real em quilômetros = realCm ÷ 100.000 */
  realKm: number;
}

/** Converte uma distância de mapa (cm) em distância real usando a escala 1:n. */
export function convertMapScale(mapCm: number, denominator: number): MapScaleConversion {
  if (!Number.isFinite(mapCm) || mapCm < 0) throw new RangeError("mapCm deve ser ≥ 0");
  if (!Number.isFinite(denominator) || denominator <= 0) throw new RangeError("denominator deve ser > 0");
  const realCm = mapCm * denominator;
  return {
    mapCm,
    denominator,
    realCm,
    realM: realCm / 100,
    realKm: realCm / CM_PER_KM,
  };
}

// ===========================================================================
// regra-de-tres — proporção entre duas grandezas
// ===========================================================================

/**
 * Regra de três.
 * - directa: a → b, c → x ⇒ x = b·c/a  (a e c são da mesma grandeza)
 * - inversa: a·b = c·x ⇒ x = a·b/c     (quando uma aumenta, a outra diminui)
 * Retorna null quando o divisor é 0 (estado limite protegido).
 */
export function ruleOfThree(
  a: number,
  b: number,
  c: number,
  kind: "directa" | "inversa",
): number | null {
  if ([a, b, c].some((v) => !Number.isFinite(v))) return null;
  if (kind === "directa") {
    if (a === 0) return null;
    return (b * c) / a;
  }
  if (c === 0) return null;
  return (a * b) / c;
}

// ===========================================================================
// razao — razão, proporção e equivalência
// ===========================================================================

/** Máximo divisor comum (inteiros não negativos). */
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/** Simplifica a razão a:b (ex.: 6:4 → 3:2). Razão com zero devolve 0:1/1:0. */
export function simplifyRatio(a: number, b: number): { a: number; b: number } {
  const g = gcd(a, b);
  if (g === 0) return { a: 0, b: 0 };
  return { a: Math.round(a) / g, b: Math.round(b) / g };
}

/** Valor da razão a/b (null se b = 0). */
export function ratioValue(a: number, b: number): number | null {
  if (b === 0) return null;
  return a / b;
}

/** a₁/b₁ = a₂/b₂ com tolerância numérica. */
export function areProportional(a1: number, b1: number, a2: number, b2: number): boolean {
  const r1 = ratioValue(a1, b1);
  const r2 = ratioValue(a2, b2);
  if (r1 === null || r2 === null) return false;
  return Math.abs(r1 - r2) < 1e-9;
}

// ===========================================================================
// alavanca — torque e equilíbrio (FÍSICA, vinculada só a cn-mecanica.alavanca)
// ===========================================================================

export const LEVER_EPSILON = 1e-9;
/** Inclinação máxima da barra (graus) quando os torques divergem ao extremo. */
export const LEVER_MAX_TILT_DEG = 12;

export interface LeverState {
  leftTorque: number;
  rightTorque: number;
  /** torque de um lado = peso × distância ao apoio (kg·m) */
  balanced: boolean;
  /** 0° quando os torques são iguais; senão cresce com a diferença relativa */
  tiltDeg: number;
  /** lado cujo torque é maior ("left" inclina a barra para a esquerda) */
  heavierSide: "left" | "right" | null;
}

/**
 * Estado de uma alavanca de dois pratos.
 * INVARIANTE: torques iguais ⇒ barra horizontal (tiltDeg = 0), texto e
 * desenho coerentes (bug original: 3 kg × 4 m = 6 kg × 2 m aparecia inclinada).
 */
export function leverState(
  leftMass: number,
  leftDistance: number,
  rightMass: number,
  rightDistance: number,
): LeverState {
  if ([leftMass, leftDistance, rightMass, rightDistance].some((v) => !Number.isFinite(v) || v < 0)) {
    throw new RangeError("massas e distâncias devem ser ≥ 0");
  }
  const leftTorque = leftMass * leftDistance;
  const rightTorque = rightMass * rightDistance;
  const diff = leftTorque - rightTorque;
  if (Math.abs(diff) < LEVER_EPSILON) {
    return { leftTorque, rightTorque, balanced: true, tiltDeg: 0, heavierSide: null };
  }
  const max = Math.max(leftTorque, rightTorque);
  const relative = Math.min(1, Math.abs(diff) / (max || 1));
  return {
    leftTorque,
    rightTorque,
    balanced: false,
    tiltDeg: relative * LEVER_MAX_TILT_DEG,
    heavierSide: diff > 0 ? "left" : "right",
  };
}

// ===========================================================================
// porcentagem — parte do todo e variações sucessivas
// ===========================================================================

/** pct% de total. */
export function percentOf(pct: number, total: number): number {
  return (pct / 100) * total;
}

export interface SuccessiveVariations {
  afterIncrease: number;
  final: number;
  /** variação líquida percentual entre o valor final e o inicial */
  netChangePct: number;
}

/** Aumento de increasePct% seguido de desconto de discountPct%. */
export function successiveVariations(
  start: number,
  increasePct: number,
  discountPct: number,
): SuccessiveVariations {
  const afterIncrease = start * (1 + increasePct / 100);
  const final = afterIncrease * (1 - discountPct / 100);
  return {
    afterIncrease,
    final,
    netChangePct: start === 0 ? 0 : (final / start - 1) * 100,
  };
}

// ===========================================================================
// fracoes — frações equivalentes
// ===========================================================================

export interface Fraction {
  n: number;
  d: number;
}

/** Frações equivalentes a n/d (multiplicadas por 2, 3, … até maxDen). */
export function equivalentFractions(n: number, d: number, maxDen = 24): Fraction[] {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d <= 0 || n <= 0) return [];
  const out: Fraction[] = [];
  for (let k = 2; d * k <= maxDen; k++) {
    out.push({ n: n * k, d: d * k });
  }
  return out;
}

// ===========================================================================
// divisao — agrupamento com resto
// ===========================================================================

export interface DivisionResult {
  quotient: number;
  remainder: number;
}

/** Divisão inteira com resto; INVARIANTE: resto < divisor e total = q·d + r. */
export function divisionWithRemainder(total: number, divisor: number): DivisionResult {
  if (!Number.isInteger(total) || !Number.isInteger(divisor) || divisor <= 0 || total < 0) {
    throw new RangeError("total ≥ 0 inteiro e divisor ≥ 1 inteiro");
  }
  return { quotient: Math.floor(total / divisor), remainder: total % divisor };
}

// ===========================================================================
// probabilidade — árvore de duas etapas com eventos independentes
// ===========================================================================

export interface TwoStagePaths {
  AA: number;
  AB: number;
  BA: number;
  BB: number;
  /** P(ao menos um A) = 1 − P(BB) */
  atLeastOneA: number;
  /** soma dos 4 caminhos (sempre 1 para p válido) */
  total: number;
}

/** Caminhos de duas etapas independentes com P(A) = pA por etapa (0–1). */
export function twoStagePaths(pA: number): TwoStagePaths {
  if (!Number.isFinite(pA) || pA < 0 || pA > 1) throw new RangeError("pA deve estar em [0, 1]");
  const p = pA;
  const q = 1 - p;
  const AA = p * p;
  const AB = p * q;
  const BA = q * p;
  const BB = q * q;
  return { AA, AB, BA, BB, atLeastOneA: 1 - BB, total: AA + AB + BA + BB };
}

// ===========================================================================
// estatistica — média, mediana e moda
// ===========================================================================

export interface SummaryMeasures {
  mean: number;
  median: number;
  /** modas (vazia quando todos os valores têm a mesma frequência) */
  modes: number[];
  n: number;
}

/** Média, mediana e moda de uma amostra (lista vazia → medidas zeradas). */
export function meanMedianMode(values: number[]): SummaryMeasures {
  const n = values.length;
  if (n === 0) return { mean: 0, median: 0, modes: [], n: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const median = n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  const modes = maxCount > 1
    ? [...counts.entries()].filter(([, c]) => c === maxCount).map(([v]) => v).sort((a, b) => a - b)
    : [];
  return { mean, median, modes, n };
}

// ===========================================================================
// funcoes — afim e quadrática
// ===========================================================================

/** Raiz de f(x) = ax + b (null se a = 0 — reta horizontal sem raiz). */
export function afimRoot(a: number, b: number): number | null {
  if (Math.abs(a) < 1e-12) return null;
  return -b / a;
}

export interface QuadraticFeatures {
  delta: number;
  /** raízes reais em ordem crescente (0, 1 ou 2; null quando a ≈ 0) */
  roots: number[] | null;
  vertex: { x: number; y: number } | null;
}

/** Δ, raízes e vértice de f(x) = ax² + bx + c. */
export function quadraticFeatures(a: number, b: number, c: number): QuadraticFeatures {
  if (Math.abs(a) < 1e-12) return { delta: b * b, roots: null, vertex: null };
  const delta = b * b - 4 * a * c;
  const roots =
    delta > 1e-12
      ? [(-b - Math.sqrt(delta)) / (2 * a), (-b + Math.sqrt(delta)) / (2 * a)].sort((x, y) => x - y)
      : Math.abs(delta) <= 1e-12
        ? [-b / (2 * a)]
        : [];
  return {
    delta,
    roots,
    vertex: { x: -b / (2 * a), y: -delta / (4 * a) },
  };
}

// ===========================================================================
// geometria — retângulo e figura em L
// ===========================================================================

export function rectMetrics(w: number, h: number): { area: number; perimeter: number } {
  if (w < 0 || h < 0) throw new RangeError("dimensões devem ser ≥ 0");
  return { area: w * h, perimeter: 2 * (w + h) };
}

/** Área da figura em L = retângulo w×h menos o recanto cw×ch. */
export function lShapeArea(w: number, h: number, cw: number, ch: number): number {
  if (cw > w || ch > h) throw new RangeError("recorte maior que o retângulo");
  return w * h - cw * ch;
}

// ===========================================================================
// genetica — quadro de Punnett (1 gene, dominância completa V > v)
// ===========================================================================

export type Genotype = "VV" | "Vv" | "vv";
export type Gamete = "V" | "v";

export function gametes(g: Genotype): [Gamete, Gamete] {
  return g === "VV" ? ["V", "V"] : g === "vv" ? ["v", "v"] : ["V", "v"];
}

export function punnettCross(a: Genotype, b: Genotype): Genotype[] {
  const ga = gametes(a);
  const gb = gametes(b);
  const out: Genotype[] = [];
  for (const x of ga) {
    for (const y of gb) {
      const pair = x === y ? (x + y) as Genotype : "Vv";
      out.push(pair);
    }
  }
  return out;
}

export interface PunnettCounts {
  VV: number;
  Vv: number;
  vv: number;
  /** fenótipo dominante (vermelha) em % */
  redPct: number;
  /** fenótipo recessivo (branca) em % */
  whitePct: number;
}

/** Contagens do quadro 2×2 (sempre somam 4) e percentuais fenotípicos. */
export function punnettCounts(a: Genotype, b: Genotype): PunnettCounts {
  const grid = punnettCross(a, b);
  const count = (g: Genotype) => grid.filter((x) => x === g).length;
  const VV = count("VV");
  const Vv = count("Vv");
  const vv = count("vv");
  return { VV, Vv, vv, redPct: ((VV + Vv) / 4) * 100, whitePct: (vv / 4) * 100 };
}

// ===========================================================================
// balanceamento — H₂ + O₂ → H₂O
// ===========================================================================

export interface H2OAtomCounts {
  leftH: number;
  leftO: number;
  rightH: number;
  rightO: number;
  balanced: boolean;
}

/** Átomos de cada lado de a·H₂ + b·O₂ → c·H₂O (com coeficientes inteiros ≥ 1). */
export function h2oAtomCounts(a: number, b: number, c: number): H2OAtomCounts {
  if (![a, b, c].every((v) => Number.isInteger(v) && v >= 1)) {
    throw new RangeError("coeficientes devem ser inteiros ≥ 1");
  }
  const leftH = a * 2;
  const leftO = b * 2;
  const rightH = c * 2;
  const rightO = c * 1;
  return { leftH, leftO, rightH, rightO, balanced: leftH === rightH && leftO === rightO };
}

// ===========================================================================
// eutrofizacao — modelo determinístico do lago (por semana)
// ===========================================================================

export interface LakeState {
  week: number;
  nutrientes: number;
  algas: number;
  /** oxigênio dissolvido em mg/L */
  od: number;
  peixesVivos: number;
}

export const LAKE_INITIAL: LakeState = { week: 0, nutrientes: 2, algas: 5, od: 8, peixesVivos: 10 };
export const LAKE_TOTAL_FISH = 10;

/** Um passo semanal do modelo: carga 0–100 (%). Determinístico. */
export function stepLake(s: LakeState, carga: number): LakeState {
  const c = Math.min(100, Math.max(0, carga));
  const nutrientes = Math.min(100, s.nutrientes * 0.88 + c * 0.12);
  const algasTarget = 4 + nutrientes * 0.9;
  const algas = Math.min(100, s.algas + (algasTarget - s.algas) * 0.3);
  const od = Math.min(8, Math.max(0.4, 8 - algas * 0.07 - c * 0.02));
  const deaths =
    od < 4 ? Math.min(s.peixesVivos, Math.max(1, Math.round((4 - od) * 2))) : 0;
  return {
    week: s.week + 1,
    nutrientes,
    algas,
    od,
    peixesVivos: Math.max(0, s.peixesVivos - deaths),
  };
}

// ===========================================================================
// mapas — população por região (Censo 2022, IBGE — primeiros resultados)
// ===========================================================================

export interface RegionDatum {
  id: string;
  name: string;
  /** população em milhões (Censo 2022) */
  population: number;
}

/** População por região (Censo 2022, IBGE). Total do país: 203,1 milhões. */
export const BRAZIL_REGIONS: readonly RegionDatum[] = [
  { id: "N", name: "Norte", population: 17.0 },
  { id: "NE", name: "Nordeste", population: 54.6 },
  { id: "SE", name: "Sudeste", population: 84.8 },
  { id: "S", name: "Sul", population: 29.2 },
  { id: "CO", name: "Centro-Oeste", population: 16.2 },
];

/** População total do país em milhões (Censo 2022): 203,1. */
export const BRAZIL_TOTAL_MILLIONS = 203.1;

/** Participação percentual de cada população no total (1 casa decimal). */
export function regionShares(populations: number[], total: number): number[] {
  if (total <= 0) throw new RangeError("total deve ser > 0");
  return populations.map((p) => Math.round((p / total) * 1000) / 10);
}
