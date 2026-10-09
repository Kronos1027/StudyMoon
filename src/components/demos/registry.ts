/**
 * Registry of interactive simulators (doc section 12).
 * Plain map of dynamic importers — loaded lazily by DemoFrame.
 * Each loader normalizes the module to a default-exported component.
 *
 * ⚠️ BINDING RULE (bugfix: demo solta do assunto da questão):
 * A simulator is ALWAYS bound to specific topic(s) via `demoTopicBindings` —
 * never to an area. A question may only display the demo of ITS OWN topic
 * (the data layer resolves `demo_id` from `topics.demo_id`, not from the
 * question row). Topics without a dedicated simulator have demo_id = null and
 * show NO demo at all — an honest nothing beats a wrong simulator.
 * tests/unit/demo-topic-binding.test.ts enforces these invariants.
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
  genetica: () => import("./genetica-demo").then((m) => ({ default: m.GeneticaDemo })),
  eutrofizacao: () =>
    import("./eutrofizacao-demo").then((m) => ({ default: m.EutrofizacaoDemo })),
  balanceamento: () =>
    import("./balanceamento-demo").then((m) => ({ default: m.BalanceamentoDemo })),
  phet: () => import("./phet-demo").then((m) => ({ default: m.PhetDemo })),
  textos: () => import("./textos-demo").then((m) => ({ default: m.TextosDemo })),
  "linha-tempo": () =>
    import("./linha-tempo-demo").then((m) => ({ default: m.LinhaTempoDemo })),
  geometria: () => import("./geometria-demo").then((m) => ({ default: m.GeometriaDemo })),
  mapas: () => import("./mapas-demo").then((m) => ({ default: m.MapasDemo })),
};

/**
 * Topics each simulator is pedagogically valid for (topic SLUGS, exact match
 * with content/curriculo.json). Keep in sync with the `demo_id` of each topic
 * in the curriculum — the unit test fails on any divergence. A simulator that
 * is generic enough to serve several topics of the SAME subject (e.g. the
 * PhET picker for physics, estatistica for reading graphs) may list them all,
 * but a simulator must NEVER list topics of a different subject.
 */
export const demoTopicBindings: Record<string, readonly string[]> = {
  porcentagem: ["mt-porcentagem-juros"],
  fracoes: ["mt-fracoes-decimais"],
  funcoes: ["mt-funcoes", "mt-geometria-analitica"],
  divisao: ["mt-operacoes-basicas", "mt-divisibilidade"],
  "razao-proporcao": ["mt-razao-proporcao"],
  probabilidade: ["mt-probabilidade", "mt-combinatoria"],
  estatistica: ["mt-estatistica", "mt-graficos-tabelas"],
  genetica: ["cn-genetica"],
  eutrofizacao: ["cn-ecologia"],
  balanceamento: ["cn-estequiometria", "cn-equilibrio-eletroquimica"],
  phet: ["cn-mecanica", "cn-energia-trabalho", "cn-ondas-optica", "cn-eletricidade"],
  textos: ["lc-interpretacao", "lc-generos-tipos", "lc-variacao-linguistica", "lc-figuras-linguagem"],
  "linha-tempo": [
    "lc-literatura-movimentos",
    "ch-brasil-colonia",
    "ch-brasil-imperio",
    "ch-brasil-republica",
    "ch-historia-geral",
  ],
  geometria: ["mt-geometria-plana", "mt-geometria-espacial"],
  mapas: ["ch-geo-fisica", "ch-geo-humana", "ch-cartografia", "ch-meio-ambiente"],
};
