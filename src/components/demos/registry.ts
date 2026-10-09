/**
 * Registry of interactive simulators (doc section 12).
 * Plain map of dynamic importers — loaded lazily by DemoFrame.
 * Each loader normalizes the module to a default-exported component that
 * accepts optional `params` (question-level demo parameters).
 *
 * ⚠️ BINDING RULE (PASSO 2 da auditoria): a simulator is bound to specific
 * SUBTOPICS via `demoSubtopicBindings` (src/lib/demos/subtopics.ts) — never
 * to a topic, and never to an area. A question may only display the demo of
 * ITS OWN subtopic (the data layer resolves demo_id from questions.subtopic
 * through the catalog). Subtopics without a simulator show NO demo at all —
 * an honest nothing beats a wrong simulator.
 * tests/unit/demo-subtopic-binding.test.ts enforces these invariants.
 */
import type { ComponentType } from "react";

/** Props every demo accepts (params come from the question/subtopic). */
export interface DemoProps {
  params?: Record<string, unknown>;
}

type Loader = () => Promise<{ default: ComponentType<DemoProps> }>;

export const demoLoaders: Record<string, Loader> = {
  porcentagem: () => import("./porcentagem-demo").then((m) => ({ default: m.PorcentagemDemo })),
  fracoes: () => import("./fracoes-demo").then((m) => ({ default: m.FracoesDemo })),
  funcoes: () => import("./funcoes-demo").then((m) => ({ default: m.FuncoesDemo })),
  divisao: () => import("./divisao-demo").then((m) => ({ default: m.DivisaoDemo })),
  razao: () => import("./razao-demo").then((m) => ({ default: m.RazaoDemo })),
  "regra-de-tres": () =>
    import("./regra-de-tres-demo").then((m) => ({ default: m.RegraDeTresDemo })),
  "escala-mapa": () =>
    import("./escala-mapa-demo").then((m) => ({ default: m.EscalaMapaDemo })),
  probabilidade: () =>
    import("./probabilidade-demo").then((m) => ({ default: m.ProbabilidadeDemo })),
  estatistica: () => import("./estatistica-demo").then((m) => ({ default: m.EstatisticaDemo })),
  genetica: () => import("./genetica-demo").then((m) => ({ default: m.GeneticaDemo })),
  eutrofizacao: () =>
    import("./eutrofizacao-demo").then((m) => ({ default: m.EutrofizacaoDemo })),
  balanceamento: () =>
    import("./balanceamento-demo").then((m) => ({ default: m.BalanceamentoDemo })),
  alavanca: () => import("./alavanca-demo").then((m) => ({ default: m.AlavancaDemo })),
  phet: () => import("./phet-demo").then((m) => ({ default: m.PhetDemo })),
  textos: () => import("./textos-demo").then((m) => ({ default: m.TextosDemo })),
  "linha-tempo": () =>
    import("./linha-tempo-demo").then((m) => ({ default: m.LinhaTempoDemo })),
  geometria: () => import("./geometria-demo").then((m) => ({ default: m.GeometriaDemo })),
  mapas: () => import("./mapas-demo").then((m) => ({ default: m.MapasDemo })),
};
