/**
 * PASSO 1 da auditoria de simuladores — inventário completo.
 *
 * Para CADA simulador lista: id, arquivo, área, vínculos (subtópicos quando
 * existem, senão tópicos), número de questões seed que o exibem e os
 * textos/fórmulas estáticos extraídos do código-fonte.
 *
 * Marca como PROBLEMA qualquer demo que:
 *  - esteja ligada a mais de um assunto distinto (agrupamento);
 *  - apareça numa questão cujo subtópico não seja o dela;
 *  - misture áreas (ex.: física dentro de matemática).
 *
 * Re-executável e idempotente: `bun scripts/audit-demos.ts` regenera
 * docs/DEMO_AUDIT.md com o estado atual. Rode após qualquer mudança no
 * registry, no catálogo de subtópicos ou nas seeds.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { demoLoaders } from "@/components/demos/registry";
import { demoSubtopicBindings, resolveDemoForQuestion } from "@/lib/demos/subtopics";

// ---------------------------------------------------------------------------
// Content loading
// ---------------------------------------------------------------------------

interface CurriculoTopic {
  slug: string;
  name: string;
  demo_id: string | null;
}
interface SeedQuestion {
  topic_slug: string;
  statement_md: string;
  context_md?: string | null;
  demo_id: string | null;
  subtopic?: string | null;
}

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, "content");
const DOCS = path.join(ROOT, "docs", "DEMO_AUDIT.md");

async function loadCurriculum() {
  const raw = JSON.parse(
    await readFile(path.join(CONTENT, "curriculo.json"), "utf8"),
  ) as {
    areas: Array<{ slug: string; name: string; disciplines: Array<{ topics: CurriculoTopic[] }> }>;
  };
  const topicToArea = new Map<string, string>();
  const topics: CurriculoTopic[] = [];
  for (const area of raw.areas) {
    for (const discipline of area.disciplines) {
      for (const topic of discipline.topics) {
        topicToArea.set(topic.slug, area.slug);
        topics.push(topic);
      }
    }
  }
  return { topics, topicToArea };
}

async function loadSeeds(): Promise<SeedQuestion[]> {
  const files = ["questions-matematica.json", "questions-areas.json"];
  const seeds: SeedQuestion[] = [];
  for (const file of files) {
    const raw = JSON.parse(
      await readFile(path.join(CONTENT, "seeds", file), "utf8"),
    ) as { questions: SeedQuestion[] };
    seeds.push(...raw.questions);
  }
  return seeds;
}

/** id → demo file, parsed from the registry source (single source of truth). */
async function demoFiles(): Promise<Map<string, string>> {
  const source = await readFile(
    path.join(ROOT, "src", "components", "demos", "registry.ts"),
    "utf8",
  );
  const map = new Map<string, string>();
  const re = /["']?([\w-]+)["']?:\s*\(\)\s*=>\s*import\(["']([^"']+)["']\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const file = match[2].replace(/^\.\//, "");
    const withExt = /\.(tsx|ts)$/.test(file) ? file : `${file}.tsx`;
    map.set(match[1], `src/components/demos/${withExt}`);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Static text / formula extraction (auditable evidence, not curated prose)
// ---------------------------------------------------------------------------

function extractTexts(source: string): string[] {
  const texts = new Set<string>();
  // Double/backtick-quoted literals with at least 10 word characters.
  const re = /["'`]((?:[^"'`\\]|\\.){10,240})["'`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const t = m[1]
      .replace(/\\\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Keep human-readable strings: letters (incl. accents), math signs, spaces.
    if (!/[A-Za-zÀ-ÿ]/.test(t)) continue;
    // Drop class names, css, imports, urls, keys.
    if (/^(use client|react|framer-motion|@\/|\.\/|https?:|var\(--|h-\d|w-\d|text-|bg-|rounded|border|px-|py-|mt-|mb-|grid|flex|space-y|font|absolute|relative|inline|shrink|mx-|my-|gap-|aspect|scroll|min-w|max-w|dark:|sm:|md:|lg:|uppercase|leading|tracking|overflow|items-|justify-|transition|hover:|aria|cn\(|m\.\w|slot|key|id$)/i.test(t)) continue;
    if (/[{}]/.test(t) && !/[A-Za-zÀ-ÿ]{4,}/.test(t.replace(/\$\{[^}]*\}/g, ""))) continue;
    texts.add(t);
  }
  return [...texts].sort((a, b) => a.localeCompare(b));
}

// ---------------------------------------------------------------------------
// Curated audit findings (kept until fixed; each has an owner commit)
// ---------------------------------------------------------------------------

interface Finding {
  demo: string;
  severity: "PROBLEMA" | "CORRIGIDO";
  issue: string;
  fix?: string;
}

const FINDINGS: Finding[] = [
  {
    demo: "razao-proporcao",
    severity: "CORRIGIDO",
    issue:
      "Mistura áreas e assuntos: contém uma ALAVANCA (conceito de FÍSICA — torque) dentro de uma demo de MATEMÁTICA, além de uma tabela de regra de três fixa com arroz (texto estático, não calculado pelos controles). Nada disso ensina ESCALA DE MAPA — mas a questão de escala (4,5 cm, 1:200.000) exibia exatamente esta demo.",
    fix: "Separada em demos independentes: razao, regra-de-tres (calculada), escala-mapa (nova) e alavanca (física, vinculada só a cn-mecanica.alavanca). Demo razao-proporcao removida.",
  },
  {
    demo: "razao-proporcao",
    severity: "CORRIGIDO",
    issue:
      "Matemática quebrada: `rightDistance` é SEMPRE recalculado para igualar o torque esquerdo (o equilíbrio é automático e trivial), e `balanced` compara DISTÂNCIAS em vez de TORQUES. Com 3 kg × 4 m = 6 kg × 2 m (torques iguais = 12), a barra aparecia INCLINADA — a animação contradizia o texto.",
    fix: "Demo descontinuada; a nova alavanca calcula torque dos dois lados e só fica horizontal quando os torques são iguais (testado: 3×4 = 6×2 ⇒ inclinação 0°).",
  },
  {
    demo: "probabilidade",
    severity: "CORRIGIDO",
    issue:
      "Agrupava assuntos: vinculada a mt-probabilidade E mt-combinatoria. A questão de senhas (princípio multiplicativo — contagem) exibia a árvore de probabilidades, que não ensina contagem.",
    fix: "Vinculação por subtópico: apenas eventos compostos (mt-probabilidade.eventos-compostos); combinatoria fica sem demo.",
  },
  {
    demo: "textos",
    severity: "CORRIGIDO",
    issue:
      "Agrupava assuntos: vinculada a 4 tópicos de Linguagens, incluindo gêneros textuais e variação linguística, que a anotação de figuras/funções não ensina.",
    fix: "Vinculada só a lc-interpretacao.interpretacao e lc-figuras-linguagem.figuras.",
  },
  {
    demo: "textos",
    severity: "PROBLEMA",
    issue:
      "A explicação da ironia contém frase truncada ('na pasta com a realidade') — texto sem sentido em português.",
    fix: "Reescrever a explicação da ironia (correção de conteúdo do PASSO 3).",
  },
  {
    demo: "linha-tempo",
    severity: "CORRIGIDO",
    issue:
      "Agrupava assuntos: a linha do tempo é de MOVIMENTOS LITERÁRIOS brasileiros, mas era vinculada a 4 tópicos de História (colônia, império, república, história geral). Questão da Era Vargas exibia eras literárias.",
    fix: "Vinculada só a lc-literatura-movimentos.movimentos; tópicos de História ficam sem demo.",
  },
  {
    demo: "mapas",
    severity: "CORRIGIDO",
    issue:
      "Agrupava assuntos: gráfico de população por região era vinculado a geo-física, cartografia e meio-ambiente (a questão de emissões de CO₂ exibia população do Censo).",
    fix: "Vinculada só a ch-geo-humana.populacao.",
  },
  {
    demo: "mapas",
    severity: "PROBLEMA",
    issue:
      "Dados do Censo 2022 imprecisos (Sul 30,4 mi; shares somando 100,4%).",
    fix: "Dados corrigidos pelo Censo 2022 (SE 84,8 mi/41,8%, NE 54,6, S 29,2, N 17,0, CO 16,2 — shares calculados pelo código somam 99,5%).",
  },
  {
    demo: "genetica",
    severity: "CORRIGIDO",
    issue:
      "Granularidade: o quadro de Punnett (1 alelo, dominância V/v) era exibido na questão do sistema ABO (alelos múltiplos e co-dominância) — conceito diferente.",
    fix: "Vinculada só ao subtópico de cruzamentos monohíbridos (cn-genetica.cruzamentos); ABO fica sem demo.",
  },
  {
    demo: "estatistica",
    severity: "CORRIGIDO",
    issue:
      "Era vinculada a mt-graficos-tabelas, cujo foco é leitura de gráficos, não média/mediana/moda.",
    fix: "Vinculada só a mt-estatistica.media-mediana-moda.",
  },
  {
    demo: "estatistica",
    severity: "PROBLEMA",
    issue: "'Adicionar aluno' sorteia nota com Math.random() (não determinístico).",
    fix: "Nota inicial determinística (correção de conteúdo do PASSO 3).",
  },
  {
    demo: "funcoes",
    severity: "PROBLEMA",
    issue:
      "SVG com min-w-[320px] causa rolagem lateral em telas de 360 px; comparação `delta === 0` com ponto flutuante.",
    fix: "SVG responsivo (escala pelo viewBox, sem min-width); delta com tolerância (correção do PASSO 3).",
  },
  {
    demo: "probabilidade",
    severity: "PROBLEMA",
    issue: "SVG com min-w-[480px] — rolagem lateral em telas de 360 px.",
    fix: "SVG responsivo sem min-width (correção do PASSO 3).",
  },
  {
    demo: "geometria",
    severity: "CORRIGIDO",
    issue:
      "Vinculada a geometria espacial (volumes), mas a demo é de áreas/perímetros planos.",
    fix: "Vinculada só a mt-geometria-plana.areas-perimetros; espacial fica sem demo.",
  },
  {
    demo: "balanceamento",
    severity: "CORRIGIDO",
    issue:
      "Vinculada a cn-equilibrio-eletroquimica, mas a demo é o balanceamento molecular H₂+O₂→H₂O, sem relação com equilíbrio químico/eletroquímica.",
    fix: "Vinculada a cn-estequiometria.balanceamento e cn-estequiometria.calculos-estequiometricos (a equação balanceada é o passo 0 do cálculo).",
  },
  {
    demo: "balanceamento",
    severity: "PROBLEMA",
    issue: "O botão do coeficiente DECREMENTA ao ser clicado (confuso: parece seletor, é ação).",
    fix: "Botão vira exibição passiva (correção do PASSO 3).",
  },
  {
    demo: "phet",
    severity: "PROBLEMA",
    issue:
      "Uma única demo com 3 simulações em abas abria SEMPRE na aba 'Movimento' — a questão do chuveiro elétrico (circuitos) exibia a de movimento. Título com erro de digitação ('Movimento ( Energia de um Skate)').",
    fix: "Aceitar o parâmetro da questão (subtópico → aba inicial: circuits/waves/motion); título corrigido (PASSO 3).",
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { topicToArea } = await loadCurriculum();
  const seeds = await loadSeeds();
  const files = await demoFiles();

  // Vínculos por subtópico (fonte da verdade: src/lib/demos/subtopics.ts).
  const bindings = demoSubtopicBindings;

  // Questions displaying each demo (resolved from each question's subtopic).
  const demoQuestions = new Map<string, SeedQuestion[]>();
  for (const demoId of Object.keys(demoLoaders)) demoQuestions.set(demoId, []);
  for (const q of seeds) {
    const displayed = resolveDemoForQuestion(q.topic_slug, q.subtopic ?? null)?.demoId ?? null;
    if (displayed && demoQuestions.has(displayed)) {
      demoQuestions.get(displayed)!.push(q);
    }
  }

  // ---- structural problem detection ----------------------------------------
  // Regras (PASSO 1):
  //  PROBLEMA: demo ligada a mais de um ASSUNTO DISTINTO = subtópicos de
  //  TÓPICOS diferentes sem justificativa documentada, ou de áreas diferentes.
  //  Vários subtópicos do MESMO tópico são facetas da mesma habilidade
  //  (ex.: regra de três direta/inversa são abas do mesmo simulador) — OK.
  const JUSTIFIED_CROSS_TOPIC: Record<string, string> = {
    divisao:
      "divisão com resto é a base dos critérios de divisibilidade (resto 0 ⇒ divisível) — mesma habilidade de dividir",
    funcoes:
      "afim/quadrática são abas do mesmo plotter; a reta da geometria analítica É a função afim (coeficiente angular/linear)",
    textos:
      "anotação interpretativa de um texto real: as marcações são figuras/funções de linguagem EM contexto de interpretação",
    phet: "seletor PhET: cada subtópico define a aba inicial via params.sim — o vínculo por subtópico garante a simulação certa",
  };
  const problems: string[] = [];
  const notes: string[] = [];
  for (const [demoId, bound] of Object.entries(bindings) as [string, readonly string[]][]) {
    const areas = new Set(bound.map((slug) => topicToArea.get(slug.split(".")[0]) ?? "?"));
    if (areas.size > 1) {
      problems.push(
        `\`${demoId}\` mistura áreas: ${[...areas].join(", ")} (via ${bound.join(", ")}).`,
      );
      continue;
    }
    const topicsOf = new Set(bound.map((slug) => slug.split(".")[0]));
    if (topicsOf.size > 1) {
      const why = JUSTIFIED_CROSS_TOPIC[demoId];
      if (why) {
        notes.push(`\`${demoId}\` atende ${topicsOf.size} tópicos da mesma área — justificativa: ${why}.`);
      } else {
        problems.push(
          `\`${demoId}\` vinculada a subtópicos de ${topicsOf.size} TÓPICOS distintos (${bound.join(", ")}) sem justificativa — separe a demo ou registre a justificativa em JUSTIFIED_CROSS_TOPIC.`,
        );
      }
    }
  }
  // questões com subtópico que não existe no tópico dela
  for (const q of seeds) {
    if (!q.subtopic) continue;
    if (!resolveDemoForQuestion(q.topic_slug, q.subtopic) && q.demo_id) {
      problems.push(
        `questão "${q.statement_md.slice(0, 48)}…" (${q.topic_slug}.${q.subtopic}) carrega demo "${q.demo_id}" que não é a do subtópico.`,
      );
    }
  }

  // ---- render markdown ------------------------------------------------------
  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`# DEMO_AUDIT.md — Auditoria dos simuladores interativos`);
  lines.push("");
  lines.push(
    `Gerado por \`scripts/audit-demos.ts\` em ${today} · vínculo por **subtópico** · ` +
      `${Object.keys(demoLoaders).length} simuladores · ${seeds.length} questões seed · ` +
      `${seeds.filter((q) => resolveDemoForQuestion(q.topic_slug, q.subtopic ?? null) !== null).length} questões com demo no estado atual.`,
  );
  lines.push("");
  lines.push(
    "> Regra permanente (docs/DECISIONS.md): nenhum simulador novo pode ser criado sem " +
      "(1) vínculo a um subtópico, (2) testes numéricos e (3) entrada neste documento. " +
      "Demo errada é pior que nenhuma demo.",
  );
  lines.push("");

  // Summary table
  lines.push(`## Visão geral`);
  lines.push("");
  lines.push("| Simulador | Arquivo | Área | Vínculo | Questões que exibem | Status |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const demoId of Object.keys(demoLoaders).sort()) {
    const bound = bindings[demoId] ?? [];
    const areas = [...new Set(bound.map((s) => topicToArea.get(s.split(".")[0]) ?? "?"))].join(", ");
    const qs = demoQuestions.get(demoId) ?? [];
    const issues = FINDINGS.filter((f) => f.demo === demoId && f.severity === "PROBLEMA");
    const status = issues.length > 0 ? `⚠️ ${issues.length} problema(s)` : "OK";
    const bindingCell = bound.length > 0 ? bound.map((b) => `\`${b}\``).join("<br>") : "—";
    lines.push(
      `| \`${demoId}\` | ${files.get(demoId) ?? "?"} | ${areas || "—"} | ${bindingCell} | ${qs.length} | ${status} |`,
    );
  }
  lines.push("");

  // Per-demo detail
  lines.push(`## Detalhe por simulador`);
  lines.push("");
  for (const demoId of Object.keys(demoLoaders).sort()) {
    const file = files.get(demoId);
    lines.push(`### \`${demoId}\``);
    lines.push("");
    lines.push(`- **Arquivo:** \`${file ?? "?"}\``);
    const bound = bindings[demoId] ?? [];
    const areas = [...new Set(bound.map((s) => topicToArea.get(s.split(".")[0]) ?? "?"))];
    lines.push(`- **Área:** ${areas.join(", ") || "—"}`);
    lines.push(
      `- **Vinculada a (subtópicos):** ${bound.length ? bound.map((b) => `\`${b}\``).join(", ") : "—"}`,
    );
    const qs = demoQuestions.get(demoId) ?? [];
    lines.push(`- **Questões seed que exibem:** ${qs.length}`);
    if (qs.length > 0) {
      lines.push("");
      lines.push("| Questão (início do enunciado) | Tópico | Subtópico |");
      lines.push("| --- | --- | --- |");
      for (const q of qs.slice(0, 12)) {
        const snippet = q.statement_md.replace(/[|\n]/g, " ").slice(0, 70);
        lines.push(`| ${snippet}… | \`${q.topic_slug}\` | ${q.subtopic ? `\`${q.subtopic}\`` : "—"} |`);
      }
      if (qs.length > 12) lines.push(`| … e mais ${qs.length - 12} | | |`);
    }
    const findings = FINDINGS.filter((f) => f.demo === demoId);
    if (findings.length > 0) {
      lines.push("");
      for (const f of findings) {
        lines.push(`- **${f.severity}:** ${f.issue}`);
        if (f.fix) lines.push(`  - **Correção:** ${f.fix}`);
      }
    }
    // Static texts extracted from the source.
    if (file) {
      try {
        const source = await readFile(path.join(ROOT, file), "utf8");
        const texts = extractTexts(source).slice(0, 36);
        if (texts.length > 0) {
          lines.push("");
          lines.push(`<details><summary>Textos e fórmulas exibidos (${texts.length} trechos extraídos do código)</summary>`);
          lines.push("");
          for (const t of texts) lines.push(`- ${t}`);
          lines.push("");
          lines.push(`</details>`);
        }
      } catch {
        /* demo file unreadable — skip extraction */
      }
    }
    lines.push("");
  }

  // Structural problems
  lines.push(`## Problemas estruturais detectados`);
  lines.push("");
  if (problems.length === 0) {
    lines.push(
      "Nenhum: nenhuma demo atende tópicos distintos sem justificativa, nenhuma mistura áreas " +
        "e nenhuma questão carrega demo de outro subtópico. Demos que atendem vários subtópicos " +
        "do MESMO tópico são facetas da mesma habilidade (ex.: regra de três direta/inversa).",
    );
  } else {
    for (const p of problems) lines.push(`- ⚠️ ${p}`);
  }
  if (notes.length > 0) {
    lines.push("");
    lines.push("### Vínculos entre tópicos (justificados)");
    for (const n of notes) lines.push(`- ℹ️ ${n}`);
  }
  lines.push("");
  lines.push(
    `## Vínculo atual (fonte da verdade: \`src/lib/demos/subtopics.ts\` + ` +
      `\`src/components/demos/registry.ts\`)`,
  );
  lines.push("");
  lines.push("```ts");
  for (const [demoId, subs] of Object.entries(demoSubtopicBindings).sort()) {
    lines.push(`${demoId}: [${subs.join(", ")}]`);
  }
  lines.push("```");
  lines.push("");

  await writeFile(DOCS, lines.join("\n"), "utf8");
  console.log(`OK: docs/DEMO_AUDIT.md gerado (vínculo por subtópico, ${Object.keys(demoLoaders).length} demos).`);
  console.log(`Problemas estruturais: ${problems.length}`);
  for (const p of problems) console.log(`  - ${p}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
