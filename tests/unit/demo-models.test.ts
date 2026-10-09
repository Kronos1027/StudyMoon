import { describe, expect, it } from "vitest";
import {
  MAP_SCALE_DENOMINATORS,
  afimRoot,
  areProportional,
  BRAZIL_REGIONS,
  BRAZIL_TOTAL_MILLIONS,
  convertMapScale,
  divisionWithRemainder,
  equivalentFractions,
  gcd,
  h2oAtomCounts,
  lShapeArea,
  LAKE_INITIAL,
  leverState,
  meanMedianMode,
  percentOf,
  punnettCounts,
  punnettCross,
  quadraticFeatures,
  rectMetrics,
  regionShares,
  ratioValue,
  ruleOfThree,
  simplifyRatio,
  stepLake,
  successiveVariations,
  twoStagePaths,
} from "@/lib/demos/models";

/**
 * PASSO 5 (invariantes numéricos): toda conta exibida pelos simuladores vem
 * de src/lib/demos/models.ts e é travada aqui com ≥ 5 valores por função,
 * incluindo os casos de auditoria do usuário:
 *   - alavanca: 3 kg × 4 m = 6 kg × 2 m ⇒ EQUILÍBRIO (tilt 0°)
 *   - escala: 4,5 cm na escala 1:200.000 ⇒ 9 km
 */

describe("escala-mapa: convertMapScale", () => {
  it("caso da auditoria: 4,5 cm em 1:200.000 = 9 km", () => {
    const r = convertMapScale(4.5, 200_000);
    expect(r.realCm).toBeCloseTo(900_000, 6);
    expect(r.realKm).toBe(9);
  });

  it("cinco valores usuais", () => {
    expect(convertMapScale(1, 100_000).realKm).toBe(1);
    expect(convertMapScale(2, 50_000).realKm).toBe(1);
    expect(convertMapScale(3, 250_000).realKm).toBe(7.5);
    expect(convertMapScale(10, 1_000_000).realKm).toBe(100);
    expect(convertMapScale(0.5, 200_000).realKm).toBe(1);
  });

  it("unidades coerentes: cm → m → km", () => {
    const r = convertMapScale(7, 50_000);
    expect(r.realCm).toBe(350_000);
    expect(r.realM).toBe(3_500);
    expect(r.realKm).toBe(3.5);
  });

  it("estados limite: 0 cm e maior escala", () => {
    expect(convertMapScale(0, 500_000).realKm).toBe(0);
    expect(convertMapScale(20, 1_000_000).realKm).toBe(200);
  });

  it("todos os denominadores do catálogo são positivos e crescentes", () => {
    expect([...MAP_SCALE_DENOMINATORS]).toEqual([...MAP_SCALE_DENOMINATORS].sort((a, b) => a - b));
    for (const d of MAP_SCALE_DENOMINATORS) expect(d).toBeGreaterThan(0);
    expect(() => convertMapScale(1, 0)).toThrow();
    expect(() => convertMapScale(-1, 100_000)).toThrow();
  });
});

describe("regra-de-tres: ruleOfThree", () => {
  it("directa: arroz 3 kg → R$ 21 ⇒ 5 kg → R$ 35", () => {
    expect(ruleOfThree(3, 21, 5, "directa")).toBeCloseTo(35, 9);
  });

  it("cinco valores directos", () => {
    expect(ruleOfThree(2, 10, 7, "directa")).toBe(35);
    expect(ruleOfThree(4, 100, 1, "directa")).toBe(25);
    expect(ruleOfThree(8, 5, 8, "directa")).toBe(5);
    expect(ruleOfThree(5, 40, 12, "directa")).toBe(96);
    expect(ruleOfThree(1, 3, 9, "directa")).toBe(27);
  });

  it("inversa: 6 operários × 12 dias = 8 operários × 9 dias", () => {
    expect(ruleOfThree(6, 12, 8, "inversa")).toBe(9);
  });

  it("cinco valores inversos", () => {
    expect(ruleOfThree(4, 15, 6, "inversa")).toBe(10);
    expect(ruleOfThree(10, 6, 4, "inversa")).toBe(15);
    expect(ruleOfThree(2, 30, 30, "inversa")).toBe(2);
    expect(ruleOfThree(5, 20, 20, "inversa")).toBe(5);
    expect(ruleOfThree(3, 12, 18, "inversa")).toBe(2);
  });

  it("estados limite protegidos (sem divisão por zero)", () => {
    expect(ruleOfThree(0, 10, 5, "directa")).toBeNull();
    expect(ruleOfThree(5, 10, 0, "inversa")).toBeNull();
    expect(ruleOfThree(0, 0, 0, "directa")).toBeNull();
    expect(ruleOfThree(Number.NaN, 1, 1, "directa")).toBeNull();
  });
});

describe("razao: gcd / simplifyRatio / ratioValue / areProportional", () => {
  it("gcd", () => {
    expect(gcd(6, 4)).toBe(2);
    expect(gcd(17, 5)).toBe(1);
    expect(gcd(0, 7)).toBe(7);
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(100, 100)).toBe(100);
  });

  it("simplifyRatio", () => {
    expect(simplifyRatio(6, 4)).toEqual({ a: 3, b: 2 });
    expect(simplifyRatio(9, 12)).toEqual({ a: 3, b: 4 });
    expect(simplifyRatio(5, 7)).toEqual({ a: 5, b: 7 });
    expect(simplifyRatio(10, 5)).toEqual({ a: 2, b: 1 });
    expect(simplifyRatio(0, 0)).toEqual({ a: 0, b: 0 });
  });

  it("ratioValue", () => {
    expect(ratioValue(3, 4)).toBe(0.75);
    expect(ratioValue(1, 2)).toBe(0.5);
    expect(ratioValue(5, 0)).toBeNull();
    expect(ratioValue(0, 5)).toBe(0);
    expect(ratioValue(7, 7)).toBe(1);
  });

  it("areProportional (proporção mantida ao dobrar a receita)", () => {
    expect(areProportional(2, 3, 4, 6)).toBe(true);
    expect(areProportional(2, 3, 4, 5)).toBe(false);
    expect(areProportional(1, 2, 10, 20)).toBe(true);
    expect(areProportional(3, 5, 30, 50)).toBe(true);
    expect(areProportional(3, 0, 5, 0)).toBe(false); // 0:0 indefinido
  });
});

describe("alavanca: leverState (invariante do bug B)", () => {
  it("3 kg × 4 m = 6 kg × 2 m ⇒ EQUILÍBRIO, barra horizontal (tilt 0°)", () => {
    const s = leverState(3, 4, 6, 2);
    expect(s.leftTorque).toBe(12);
    expect(s.rightTorque).toBe(12);
    expect(s.balanced).toBe(true);
    expect(s.tiltDeg).toBe(0);
    expect(s.heavierSide).toBeNull();
  });

  it("cinco estados com torques desiguais inclinam para o lado de MAIOR torque", () => {
    const s1 = leverState(3, 4, 6, 1); // 12 vs 6 ⇒ esquerda
    expect(s1.balanced).toBe(false);
    expect(s1.heavierSide).toBe("left");
    expect(s1.tiltDeg).toBeGreaterThan(0);

    const s2 = leverState(6, 1, 3, 4); // 6 vs 12 ⇒ direita
    expect(s2.heavierSide).toBe("right");

    const s3 = leverState(10, 2, 4, 5); // 20 vs 20 ⇒ equilíbrio
    expect(s3.balanced).toBe(true);

    const s4 = leverState(2, 2, 2, 2); // 4 vs 4 ⇒ equilíbrio
    expect(s4.balanced).toBe(true);

    const s5 = leverState(1, 1, 1, 10); // 1 vs 10 ⇒ direita, quase máximo
    expect(s5.heavierSide).toBe("right");
    expect(s5.tiltDeg).toBeGreaterThan(10); // diferença relativa 90% ⇒ ~10,8°
  });

  it("ângulo proporcional à diferença (cresce com o desequilíbrio)", () => {
    const small = leverState(10, 2, 9, 2); // 20 vs 18 ⇒ 10% relativo
    const big = leverState(10, 2, 5, 2); // 20 vs 10 ⇒ 50% relativo
    expect(big.tiltDeg).toBeGreaterThan(small.tiltDeg);
    expect(small.tiltDeg).toBeCloseTo(1.2, 6); // 10% × 12°
    expect(big.tiltDeg).toBeCloseTo(6, 6); // 50% × 12°
  });

  it("estados limite: zeros e massas máximas não quebram", () => {
    const zero = leverState(0, 0, 0, 0); // 0 = 0 ⇒ equilíbrio
    expect(zero.balanced).toBe(true);
    expect(leverState(12, 8, 12, 8).balanced).toBe(true);
    expect(leverState(12, 8, 1, 1).heavierSide).toBe("left");
    expect(() => leverState(-1, 2, 3, 4)).toThrow();
  });

  it("torque = massa × distância em todas as combinações", () => {
    for (const [m, d] of [[1, 1], [3, 4], [6, 2], [0.5, 8], [12, 0.5]] as const) {
      const s = leverState(m, d, m, d);
      expect(s.leftTorque).toBe(m * d);
    }
  });
});

describe("porcentagem: percentOf / successiveVariations", () => {
  it("+20% e depois −10% NÃO se cancelam: variação líquida +8%", () => {
    const r = successiveVariations(200, 20, 10);
    expect(r.afterIncrease).toBe(240);
    expect(r.final).toBe(216);
    expect(r.netChangePct).toBeCloseTo(8, 9);
  });

  it("cinco combinações", () => {
    expect(successiveVariations(100, 10, 10).netChangePct).toBeCloseTo(-1, 9);
    expect(successiveVariations(100, 0, 0).final).toBe(100);
    expect(successiveVariations(50, 100, 50).final).toBe(50); // 50→100→50: +100% e −50% SE cancelam
    expect(successiveVariations(80, 25, 0).final).toBe(100);
    expect(successiveVariations(1000, 5, 5).final).toBeCloseTo(997.5, 9);
  });

  it("percentOf", () => {
    expect(percentOf(30, 100)).toBe(30);
    expect(percentOf(15, 200)).toBe(30);
    expect(percentOf(0, 999)).toBe(0);
    expect(percentOf(100, 42)).toBe(42);
    expect(percentOf(12.5, 80)).toBe(10);
  });

  it("estados limite: 100% de desconto e valor inicial 0", () => {
    expect(successiveVariations(200, 50, 100).final).toBe(0);
    expect(successiveVariations(0, 20, 10).final).toBe(0);
    expect(successiveVariations(0, 20, 10).netChangePct).toBe(0);
  });
});

describe("fracoes: equivalentFractions", () => {
  it("equivalências de 3/4", () => {
    expect(equivalentFractions(3, 4)).toEqual([
      { n: 6, d: 8 },
      { n: 9, d: 12 },
      { n: 12, d: 16 },
      { n: 15, d: 20 },
      { n: 18, d: 24 },
    ]);
  });

  it("cinco casos", () => {
    expect(equivalentFractions(1, 2)).toHaveLength(11); // até d=24
    expect(equivalentFractions(1, 12)).toEqual([{ n: 2, d: 24 }]);
    expect(equivalentFractions(5, 12, 48)).toContainEqual({ n: 20, d: 48 });
    expect(equivalentFractions(0, 5)).toEqual([]); // 0/5×k não acrescenta nada
    expect(equivalentFractions(3, 0)).toEqual([]);
  });

  it("n/d preservada: mesmo valor decimal", () => {
    for (const f of equivalentFractions(2, 3, 60)) {
      expect(f.n / f.d).toBeCloseTo(2 / 3, 12);
    }
  });
});

describe("divisao: divisionWithRemainder", () => {
  it("invariante: total = quociente × divisor + resto, com resto < divisor", () => {
    for (const [total, divisor] of [[14, 4], [30, 5], [1, 7], [0, 3], [26, 8]] as const) {
      const r = divisionWithRemainder(total, divisor);
      expect(r.quotient * divisor + r.remainder).toBe(total);
      expect(r.remainder).toBeLessThan(divisor);
    }
  });

  it("cinco valores explícitos", () => {
    expect(divisionWithRemainder(14, 4)).toEqual({ quotient: 3, remainder: 2 });
    expect(divisionWithRemainder(30, 5)).toEqual({ quotient: 6, remainder: 0 });
    expect(divisionWithRemainder(1, 7)).toEqual({ quotient: 0, remainder: 1 });
    expect(divisionWithRemainder(0, 3)).toEqual({ quotient: 0, remainder: 0 });
    expect(divisionWithRemainder(26, 8)).toEqual({ quotient: 3, remainder: 2 });
  });

  it("divisor 0 é protegido", () => {
    expect(() => divisionWithRemainder(10, 0)).toThrow();
  });
});

describe("probabilidade: twoStagePaths", () => {
  it("soma dos caminhos é sempre 100%", () => {
    for (const p of [0, 0.05, 0.25, 0.5, 0.6, 0.75, 0.95, 1]) {
      expect(twoStagePaths(p).total).toBeCloseTo(1, 12);
    }
  });

  it("moeda honesta: AA = BB = 25% e ao menos um A = 75%", () => {
    const r = twoStagePaths(0.5);
    expect(r.AA).toBeCloseTo(0.25, 12);
    expect(r.BB).toBeCloseTo(0.25, 12);
    expect(r.atLeastOneA).toBeCloseTo(0.75, 12);
  });

  it("pA = 60% (estado padrão da demo)", () => {
    const r = twoStagePaths(0.6);
    expect(r.AA).toBeCloseTo(0.36, 12);
    expect(r.AB).toBeCloseTo(0.24, 12);
    expect(r.atLeastOneA).toBeCloseTo(0.84, 12);
  });

  it("estados limite 0% e 100%", () => {
    expect(twoStagePaths(0)).toEqual({ AA: 0, AB: 0, BA: 0, BB: 1, atLeastOneA: 0, total: 1 });
    expect(twoStagePaths(1)).toEqual({ AA: 1, AB: 0, BA: 0, BB: 0, atLeastOneA: 1, total: 1 });
  });

  it("pA fora de [0,1] é rejeitado", () => {
    expect(() => twoStagePaths(1.5)).toThrow();
    expect(() => twoStagePaths(-0.1)).toThrow();
  });
});

describe("estatistica: meanMedianMode", () => {
  it("notas da demo: [6,7,8,9,3] ⇒ média 6,6 · mediana 7 · sem moda", () => {
    const r = meanMedianMode([6, 7, 8, 9, 3]);
    expect(r.mean).toBeCloseTo(6.6, 9);
    expect(r.median).toBe(7);
    expect(r.modes).toEqual([]);
  });

  it("cinco conjuntos", () => {
    expect(meanMedianMode([1, 2, 3, 4, 100]).median).toBe(3); // outlier não arrasta a mediana
    expect(meanMedianMode([1, 2, 3, 4]).median).toBe(2.5); // par
    expect(meanMedianMode([5, 5, 5]).modes).toEqual([5]);
    expect(meanMedianMode([1, 1, 2, 2, 3]).modes).toEqual([1, 2]); // bimodal
    expect(meanMedianMode([])).toEqual({ mean: 0, median: 0, modes: [], n: 0 });
  });

  it("média confere com a soma", () => {
    const values = [10, 20, 30, 40];
    expect(meanMedianMode(values).mean).toBe(values.reduce((a, b) => a + b, 0) / values.length);
  });
});

describe("funcoes: afimRoot / quadraticFeatures", () => {
  it("raiz de f(x) = ax + b", () => {
    expect(afimRoot(2, -6)).toBe(3);
    expect(afimRoot(1, 5)).toBe(-5);
    expect(afimRoot(-0.5, 2)).toBe(4);
    expect(afimRoot(0.1, -1)).toBeCloseTo(10, 9);
    expect(afimRoot(0, 5)).toBeNull(); // reta horizontal
  });

  it("quadrática: Δ, raízes e vértice", () => {
    const r = quadraticFeatures(1, -2, -3); // x²−2x−3 = (x−3)(x+1)
    expect(r.delta).toBe(16);
    expect(r.roots).toEqual([-1, 3]);
    expect(r.vertex).toEqual({ x: 1, y: -4 });
  });

  it("cinco quadráticas", () => {
    expect(quadraticFeatures(1, 0, -4).roots).toEqual([-2, 2]);
    expect(quadraticFeatures(1, -4, 4).roots).toEqual([2]); // raiz dupla (Δ=0)
    expect(quadraticFeatures(1, 0, 4).roots).toEqual([]); // Δ<0
    expect(quadraticFeatures(-1, 0, 4).roots).toEqual([-2, 2]);
    expect(quadraticFeatures(0, 2, 1).roots).toBeNull(); // a≈0
  });

  it("lucro máximo (questão seed): L(x) = −x² + 6x − 5 tem máximo no vértice", () => {
    const r = quadraticFeatures(-1, 6, -5);
    expect(r.vertex).toEqual({ x: 3, y: 4 });
  });

  it("vértice sempre em x = −b/2a", () => {
    for (const [a, b, c] of [[1, -2, -3], [2, 4, 1], [-0.5, 3, 2], [1, 0, 0], [3, -12, 9]] as const) {
      const r = quadraticFeatures(a, b, c);
      expect(r.vertex!.x).toBeCloseTo(-b / (2 * a), 9);
    }
  });
});

describe("geometria: rectMetrics / lShapeArea", () => {
  it("retângulo 4×3", () => {
    expect(rectMetrics(4, 3)).toEqual({ area: 12, perimeter: 14 });
  });

  it("cinco retângulos", () => {
    expect(rectMetrics(1, 1)).toEqual({ area: 1, perimeter: 4 });
    expect(rectMetrics(8, 6)).toEqual({ area: 48, perimeter: 28 });
    expect(rectMetrics(5, 5)).toEqual({ area: 25, perimeter: 20 });
    expect(rectMetrics(0, 10).area).toBe(0);
    expect(rectMetrics(2.5, 4).area).toBe(10);
  });

  it("figura em L = retângulo − recorte", () => {
    expect(lShapeArea(4, 3, 2, 1)).toBe(10);
    expect(lShapeArea(10, 10, 5, 5)).toBe(75);
    expect(lShapeArea(6, 4, 3, 2)).toBe(18);
    expect(lShapeArea(2, 2, 0, 0)).toBe(4);
    expect(() => lShapeArea(2, 2, 3, 1)).toThrow(); // recorte maior que a figura
  });
});

describe("genetica: punnettCross / punnettCounts", () => {
  it("Vv × Vv ⇒ 1 VV : 2 Vv : 1 vv (3:1 fenotípico)", () => {
    const c = punnettCounts("Vv", "Vv");
    expect(c.VV).toBe(1);
    expect(c.Vv).toBe(2);
    expect(c.vv).toBe(1);
    expect(c.redPct).toBe(75);
    expect(c.whitePct).toBe(25);
  });

  it("cinco cruzamentos", () => {
    expect(punnettCounts("VV", "VV")).toMatchObject({ VV: 4, Vv: 0, vv: 0, whitePct: 0 });
    expect(punnettCounts("VV", "vv")).toMatchObject({ Vv: 4, whitePct: 0 });
    expect(punnettCounts("vv", "vv")).toMatchObject({ vv: 4, whitePct: 100 });
    expect(punnettCounts("Vv", "vv")).toMatchObject({ Vv: 2, vv: 2, whitePct: 50 });
    expect(punnettCounts("vv", "Vv")).toMatchObject({ Vv: 2, vv: 2, whitePct: 50 });
  });

  it("o quadro sempre tem 4 células", () => {
    for (const a of ["VV", "Vv", "vv"] as const) {
      for (const b of ["VV", "Vv", "vv"] as const) {
        expect(punnettCross(a, b)).toHaveLength(4);
      }
    }
  });
});

describe("balanceamento: h2oAtomCounts", () => {
  it("2 H₂ + 1 O₂ → 2 H₂O é a combinação equilibrada mínima", () => {
    const r = h2oAtomCounts(2, 1, 2);
    expect(r).toMatchObject({ leftH: 4, leftO: 2, rightH: 4, rightO: 2, balanced: true });
  });

  it("cinco combinações", () => {
    expect(h2oAtomCounts(1, 1, 1).balanced).toBe(false); // 2H/2O vs 2H/1O
    expect(h2oAtomCounts(4, 2, 4).balanced).toBe(true); // múltiplo
    expect(h2oAtomCounts(2, 1, 1).balanced).toBe(false); // 4H/2O vs 2H/1O
    expect(h2oAtomCounts(3, 2, 3).balanced).toBe(false); // 6H/4O vs 6H/3O
    expect(h2oAtomCounts(6, 3, 6).balanced).toBe(true);
  });

  it("invariante de Lavoisier: equilibrado ⇔ átomos iguais nos dois lados", () => {
    for (let a = 1; a <= 4; a++) {
      for (let b = 1; b <= 4; b++) {
        for (let c = 1; c <= 4; c++) {
          const r = h2oAtomCounts(a, b, c);
          expect(r.balanced).toBe(r.leftH === r.rightH && r.leftO === r.rightO);
        }
      }
    }
  });

  it("coeficientes inválidos são rejeitados", () => {
    expect(() => h2oAtomCounts(0, 1, 1)).toThrow();
    expect(() => h2oAtomCounts(1.5, 1, 1)).toThrow();
  });
});

describe("eutrofizacao: stepLake", () => {
  it("carga 0 mantém o lago saudável (OD alto, sem mortes)", () => {
    let s = LAKE_INITIAL;
    for (let i = 0; i < 10; i++) s = stepLake(s, 0);
    expect(s.od).toBeGreaterThanOrEqual(6);
    expect(s.peixesVivos).toBe(10);
  });

  it("carga alta mata peixes ao longo das semanas (OD cai abaixo de 4)", () => {
    let s = LAKE_INITIAL;
    for (let i = 0; i < 12; i++) s = stepLake(s, 90);
    expect(s.od).toBeLessThan(4);
    expect(s.peixesVivos).toBeLessThan(10);
  });

  it("estados extremos da carga (0 e 100) nunca geram NaN nem valores fora da faixa", () => {
    let s = LAKE_INITIAL;
    for (let i = 0; i < 40; i++) {
      s = stepLake(s, i % 2 === 0 ? 0 : 100);
      expect(Number.isFinite(s.od)).toBe(true);
      expect(s.od).toBeGreaterThanOrEqual(0.4);
      expect(s.od).toBeLessThanOrEqual(8);
      expect(s.algas).toBeLessThanOrEqual(100);
    }
  });

  it("modelo é determinístico (mesma entrada ⇒ mesmo estado)", () => {
    const run = (carga: number, weeks: number) => {
      let s = LAKE_INITIAL;
      for (let i = 0; i < weeks; i++) s = stepLake(s, carga);
      return s;
    };
    expect(run(60, 8)).toEqual(run(60, 8));
  });

  it("carga 60% leva à zona crítica em algumas semanas (comportamento esperado)", () => {
    let s = LAKE_INITIAL;
    for (let i = 0; i < 15; i++) s = stepLake(s, 60);
    expect(s.od).toBeLessThan(5);
    expect(s.peixesVivos).toBeLessThan(10);
  });
});

describe("mapas: população por região (Censo 2022)", () => {
  it("Sudeste é a região mais populosa (84,8 mi)", () => {
    const se = BRAZIL_REGIONS.find((r) => r.id === "SE");
    expect(se?.population).toBe(84.8);
    expect(Math.max(...BRAZIL_REGIONS.map((r) => r.population))).toBe(84.8);
  });

  it("participações somam ~100% do total do país", () => {
    const shares = regionShares(BRAZIL_REGIONS.map((r) => r.population), BRAZIL_TOTAL_MILLIONS);
    const sum = shares.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(99);
    expect(sum).toBeLessThanOrEqual(100.5);
  });

  it("cinco participações explícitas (Censo 2022)", () => {
    const shares = regionShares(BRAZIL_REGIONS.map((r) => r.population), BRAZIL_TOTAL_MILLIONS);
    expect(shares[0]).toBe(8.4); // Norte
    expect(shares[1]).toBe(26.9); // Nordeste
    expect(shares[2]).toBe(41.8); // Sudeste
    expect(shares[3]).toBe(14.4); // Sul
    expect(shares[4]).toBe(8.0); // Centro-Oeste
  });

  it("total ≤ 0 é rejeitado", () => {
    expect(() => regionShares([1, 2], 0)).toThrow();
  });
});
