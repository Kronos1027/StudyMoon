/**
 * Catálogo de SUBTÓPICOS e resolução demo ↔ questão (PASSO 2 da auditoria).
 *
 * CAUSA RAIZ CORRIGIDA: a demo exibida com uma questão era vinculada ao
 * TÓPICO (granularidade larga) — uma demo genérica "servia" para vários
 * assuntos (ex.: a demo "razao-proporcao" aparecia na questão de ESCALA).
 * Agora o vínculo é por SUBTÓPICO: cada subtópico declara qual simulador
 * (se algum) pode aparecer nas questões dele. Subtópico sem simulador ⇒
 * nenhuma demo ("demo errada é pior que nenhuma demo").
 *
 * A resolução acontece NO CÓDIGO (server actions), a partir de
 * `questions.subtopic` — trocar um vínculo aqui corrige a produção sem
 * tocar no banco. `questions.demo_id` continua existindo só como espelho
 * de higiene (scripts/sync-demo-bindings.ts).
 *
 * Módulo puro (sem imports) — usado por server actions, testes e scripts.
 */

export type DemoParam = string | number | boolean;
export type DemoParams = Readonly<Record<string, DemoParam>>;

export interface DemoSubtopic {
  /** slug LOCAL, único dentro do tópico (ex.: "escala") */
  readonly slug: string;
  readonly name: string;
  /** simulador válido para este subtópico (null = sem demo) */
  readonly demoId: string | null;
  /** parâmetros padrão da demo neste subtópico (ex.: aba inicial do PhET) */
  readonly demoParams?: DemoParams;
}

/**
 * Catálogo: tópico → subtópicos. A demo de um subtópico É o vínculo —
 * não existe vínculo no nível do tópico nem da área.
 */
export const TOPIC_SUBTOPICS: Readonly<Record<string, readonly DemoSubtopic[]>> = {
  // ---- Matemática ----------------------------------------------------------
  "mt-porcentagem-juros": [
    { slug: "porcentagem", name: "Porcentagem e variações", demoId: "porcentagem" },
    { slug: "variacoes-sucessivas", name: "Aumentos e descontos sucessivos", demoId: "porcentagem" },
    { slug: "juros-simples", name: "Juros simples", demoId: null },
    { slug: "juros-compostos", name: "Juros compostos", demoId: "porcentagem" },
  ],
  "mt-fracoes-decimais": [
    { slug: "fracoes", name: "Frações e parte do todo", demoId: "fracoes" },
    { slug: "decimais", name: "Números decimais", demoId: null },
  ],
  "mt-razao-proporcao": [
    { slug: "razao", name: "Razão entre grandezas", demoId: "razao" },
    { slug: "proporcao", name: "Proporção e proporcionalidade", demoId: "razao" },
    { slug: "regra-de-tres-direta", name: "Regra de três direta", demoId: "regra-de-tres" },
    { slug: "regra-de-tres-inversa", name: "Regra de três inversa", demoId: "regra-de-tres" },
    {
      slug: "escala",
      name: "Escala de mapas e plantas",
      demoId: "escala-mapa",
      demoParams: { distanceCm: 4, scale: 100_000 },
    },
  ],
  "mt-operacoes-basicas": [
    { slug: "adicao-subtracao", name: "Adição e subtração", demoId: null },
    { slug: "multiplicacao-divisao", name: "Multiplicação e divisão", demoId: "divisao" },
    { slug: "problemas", name: "Problemas do dia a dia", demoId: null },
  ],
  "mt-divisibilidade": [
    { slug: "criterios", name: "Critérios de divisibilidade", demoId: "divisao" },
    { slug: "mmc-mdc", name: "Múltiplos, divisores, MMC e MDC", demoId: null },
  ],
  "mt-funcoes": [
    { slug: "afim", name: "Função afim (1º grau)", demoId: "funcoes" },
    { slug: "quadratica", name: "Função quadrática (2º grau)", demoId: "funcoes" },
    { slug: "exponencial", name: "Crescimento exponencial", demoId: null },
  ],
  "mt-estatistica": [
    { slug: "media-mediana-moda", name: "Média, mediana e moda", demoId: "estatistica" },
    { slug: "leitura-dados", name: "Leitura e comparação de dados", demoId: null },
  ],
  "mt-probabilidade": [
    { slug: "probabilidade-simples", name: "Probabilidade simples", demoId: null },
    { slug: "eventos-compostos", name: "Eventos compostos e independentes", demoId: "probabilidade" },
  ],
  "mt-combinatoria": [
    { slug: "principio-multiplicativo", name: "Princípio multiplicativo", demoId: null },
    { slug: "permutacoes", name: "Permutações", demoId: null },
    { slug: "combinacoes", name: "Combinações", demoId: null },
  ],
  "mt-geometria-plana": [
    { slug: "areas-perimetros", name: "Áreas e perímetros", demoId: "geometria" },
    { slug: "pitagoras", name: "Teorema de Pitágoras", demoId: null },
  ],
  "mt-geometria-espacial": [{ slug: "volumes", name: "Volumes", demoId: null }],
  "mt-geometria-analitica": [
    { slug: "reta", name: "Equação da reta", demoId: "funcoes" },
    { slug: "circunferencia", name: "Circunferência", demoId: null },
  ],
  "mt-trigonometria": [{ slug: "triangulos-retangulos", name: "Triângulos retângulos", demoId: null }],
  "mt-sequencias": [{ slug: "progressoes", name: "Progressões (PA e PG)", demoId: null }],
  "mt-graficos-tabelas": [
    { slug: "leitura-graficos", name: "Leitura de gráficos", demoId: null },
    { slug: "tabelas", name: "Tabelas", demoId: null },
  ],
  // ---- Ciências da Natureza ----------------------------------------------
  "cn-mecanica": [
    { slug: "cinematica", name: "Cinemática", demoId: null },
    { slug: "dinamica-forcas", name: "Forças e leis de Newton", demoId: null },
    { slug: "alavanca", name: "Alavancas e máquinas simples", demoId: "alavanca" },
    { slug: "energia-mecanica", name: "Energia mecânica", demoId: "phet", demoParams: { sim: "motion" } },
    { slug: "trabalho-potencia", name: "Trabalho e potência", demoId: null },
  ],
  "cn-energia-trabalho": [
    { slug: "fontes-transformacoes", name: "Fontes e transformações de energia", demoId: "phet", demoParams: { sim: "motion" } },
    { slug: "trabalho-potencia", name: "Trabalho e potência", demoId: null },
  ],
  "cn-ondas-optica": [
    { slug: "ondas", name: "Ondas e som", demoId: "phet", demoParams: { sim: "waves" } },
    { slug: "optica", name: "Óptica", demoId: null },
  ],
  "cn-eletricidade": [
    { slug: "circuitos", name: "Circuitos elétricos", demoId: "phet", demoParams: { sim: "circuits" } },
    { slug: "potencia-eletrica", name: "Potência e consumo elétrico", demoId: "phet", demoParams: { sim: "circuits" } },
    { slug: "eletrostatica", name: "Eletrostática", demoId: null },
  ],
  "cn-estequiometria": [
    { slug: "balanceamento", name: "Balanceamento de equações", demoId: "balanceamento" },
    { slug: "calculos-estequiometricos", name: "Cálculos estequiométricos", demoId: "balanceamento" },
  ],
  "cn-equilibrio-eletroquimica": [
    { slug: "equilibrio-quimico", name: "Equilíbrio químico", demoId: null },
    { slug: "eletroquimica", name: "Eletroquímica", demoId: null },
  ],
  "cn-genetica": [
    { slug: "cruzamentos", name: "Cruzamentos e quadro de Punnett (1ª lei)", demoId: "genetica" },
    { slug: "sistema-abo", name: "Sistema ABO (alelos múltiplos)", demoId: null },
    { slug: "heredogramas", name: "Heredogramas", demoId: null },
  ],
  "cn-ecologia": [
    { slug: "eutrofizacao", name: "Eutrofização e poluição aquática", demoId: "eutrofizacao" },
    { slug: "cadeias-alimentares", name: "Cadeias alimentares", demoId: null },
    { slug: "ciclos-biogeoquimicos", name: "Ciclos biogeoquímicos", demoId: null },
    { slug: "relacoes-ecologicas", name: "Relações ecológicas", demoId: null },
  ],
  "cn-fisiologia": [{ slug: "homeostase", name: "Homeostase", demoId: null }],
  // ---- Linguagens ----------------------------------------------------------
  "lc-interpretacao": [{ slug: "interpretacao", name: "Interpretação de texto", demoId: "textos" }],
  "lc-generos-tipos": [{ slug: "generos", name: "Gêneros e tipos textuais", demoId: null }],
  "lc-variacao-linguistica": [{ slug: "registro", name: "Registro e variação linguística", demoId: null }],
  "lc-figuras-linguagem": [{ slug: "figuras", name: "Figuras de linguagem", demoId: "textos" }],
  "lc-literatura-movimentos": [{ slug: "movimentos", name: "Movimentos literários", demoId: "linha-tempo" }],
  // ---- Ciências Humanas ----------------------------------------------------
  "ch-geo-fisica": [{ slug: "relevo-clima", name: "Relevo e clima", demoId: null }],
  "ch-geo-humana": [
    { slug: "populacao", name: "População e urbanização", demoId: "mapas" },
    { slug: "urbanizacao-economia", name: "Urbanização e economia", demoId: null },
  ],
  "ch-cartografia": [{ slug: "escalas-projecoes", name: "Escalas e projeções", demoId: null }],
  "ch-meio-ambiente": [{ slug: "mudancas-climaticas", name: "Mudanças climáticas", demoId: null }],
  "ch-brasil-republica": [{ slug: "era-vargas", name: "Era Vargas e Estado Novo", demoId: null }],
};

/** Slug completo = `<tópico>.<subtópico>` (ex.: "mt-razao-proporcao.escala"). */
export function fullSubtopicSlug(topicSlug: string, subtopicSlug: string): string {
  return `${topicSlug}.${subtopicSlug}`;
}

/** Busca um subtópico pelo slug local dentro do tópico. */
export function getSubtopic(
  topicSlug: string,
  subtopicSlug: string | null | undefined,
): DemoSubtopic | null {
  if (!subtopicSlug) return null;
  const list = TOPIC_SUBTOPICS[topicSlug];
  if (!list) return null;
  return list.find((s) => s.slug === subtopicSlug) ?? null;
}

export interface DemoResolution {
  demoId: string;
  /** padrão do subtópico mesclado com os parâmetros da questão (questão vence) */
  params: Record<string, DemoParam>;
}

/**
 * Resolve qual simulador uma questão pode exibir.
 *
 * REGRA (estrita): só há demo quando a questão declara um subtópico que
 * (a) existe no catálogo, DENTRO do tópico da questão, e (b) tem simulador.
 * Qualquer outra combinação → null → nenhuma demo. A demo nunca vem do
 * tópico nem da área.
 */
export function resolveDemoForQuestion(
  topicSlug: string,
  subtopicSlug: string | null | undefined,
  questionParams?: Record<string, DemoParam | null | undefined> | null,
): DemoResolution | null {
  const sub = getSubtopic(topicSlug, subtopicSlug);
  if (!sub || !sub.demoId) return null;
  const params: Record<string, DemoParam> = { ...(sub.demoParams ?? {}) };
  if (questionParams) {
    for (const [key, value] of Object.entries(questionParams)) {
      if (value === null || value === undefined) continue;
      if (typeof value === "object") continue; // jsonb aninhado não é parâmetro
      params[key] = value as DemoParam;
    }
  }
  return { demoId: sub.demoId, params };
}

/** Todos os slugs completos de subtópicos ligados a uma demo. */
export function demoSubtopicFullSlugs(demoId: string): string[] {
  const out: string[] = [];
  for (const [topicSlug, subs] of Object.entries(TOPIC_SUBTOPICS)) {
    for (const sub of subs) {
      if (sub.demoId === demoId) out.push(fullSubtopicSlug(topicSlug, sub.slug));
    }
  }
  return out.sort();
}

/** Mapa demo → subtópicos (o VÍNCULO por excelência; derivado do catálogo). */
export const demoSubtopicBindings: Readonly<Record<string, readonly string[]>> = (() => {
  const map = new Map<string, string[]>();
  for (const [topicSlug, subs] of Object.entries(TOPIC_SUBTOPICS)) {
    for (const sub of subs) {
      if (!sub.demoId) continue;
      const list = map.get(sub.demoId) ?? [];
      list.push(fullSubtopicSlug(topicSlug, sub.slug));
      map.set(sub.demoId, list);
    }
  }
  return Object.fromEntries([...map.entries()].map(([k, v]) => [k, [...new Set(v)].sort()]));
})();

/** Área de um tópico pela convenção de slug (`mt-razao-proporcao` → `mt`). */
const AREA_PREFIX_ALIASES: Readonly<Record<string, string>> = {
  rd: "redacao", // área "redacao" usa o prefixo curto rd-
};
export function areaOfTopicSlug(topicSlug: string): string {
  const prefix = topicSlug.split("-")[0];
  return AREA_PREFIX_ALIASES[prefix] ?? prefix;
}
