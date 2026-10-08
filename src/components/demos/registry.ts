/**
 * Registry of interactive simulators (doc section 12).
 * Plain map of dynamic importers — loaded lazily by DemoFrame.
 * Each loader normalizes the module to a default-exported component.
 */
import type { ComponentType } from "react";

type Loader = () => Promise<{ default: ComponentType }>;

export const demoLoaders: Record<string, Loader> = {
  porcentagem: () => import("./porcentagem-demo").then((m) => ({ default: m.PorcentagemDemo })),
  fracoes: () => import("./fracoes-demo").then((m) => ({ default: m.FracoesDemo })),
  funcoes: () => import("./funcoes-demo").then((m) => ({ default: m.FuncoesDemo })),
  divisao: () => import("./divisao-demo").then((m) => ({ default: m.DivisaoDemo })),
  "razao-proporcao": () =>
    import("./razao-proporcao-demo").then((m) => ({ default: m.RazaoProporcaoDemo })),
  probabilidade: () =>
    import("./probabilidade-demo").then((m) => ({ default: m.ProbabilidadeDemo })),
  estatistica: () => import("./estatistica-demo").then((m) => ({ default: m.EstatisticaDemo })),
  biologia: () => import("./biologia-demo").then((m) => ({ default: m.BiologiaDemo })),
  balanceamento: () =>
    import("./balanceamento-demo").then((m) => ({ default: m.BalanceamentoDemo })),
  phet: () => import("./phet-demo").then((m) => ({ default: m.PhetDemo })),
  textos: () => import("./textos-demo").then((m) => ({ default: m.TextosDemo })),
  "linha-tempo": () => import("./linha-tempo-demo").then((m) => ({ default: m.LinhaTempoDemo })),
  geometria: () => import("./geometria-demo").then((m) => ({ default: m.GeometriaDemo })),
  mapas: () => import("./mapas-demo").then((m) => ({ default: m.MapasDemo })),
};
