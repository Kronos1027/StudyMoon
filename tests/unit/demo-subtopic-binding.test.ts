import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { demoLoaders } from "@/components/demos/registry";
import {
  TOPIC_SUBTOPICS,
  demoSubtopicBindings,
  getSubtopic,
  resolveDemoForQuestion,
  areaOfTopicSlug,
} from "@/lib/demos/subtopics";

/**
 * Guarda de regressão do bug "Veja o conceito em movimento desligado do
 * assunto" — agora em NÍVEL DE SUBTÓPICO (PASSO 5 da auditoria).
 *
 * Histórico: demos já foram vinculadas à ÁREA (quadro de Punnett em questão
 * de eutrofização) e ao TÓPICO (alavanca de física + tabela de arroz em
 * questão de ESCALA DE MAPA). Agora o vínculo é por SUBTÓPICO: a demo
 * exibida por uma questão é sempre a do subtópico DELA, resolvida do
 * catálogo em código — nunca do tópico, nunca da área.
 */

interface CurriculoTopic {
  slug: string;
  name: string;
  demo_id: string | null;
}
interface SeedQuestion {
  topic_slug: string;
  statement_md: string;
  context_md?: string | null;
  subtopic?: string | null;
  demo_params?: Record<string, string | number | boolean> | null;
  demo_id?: string | null;
}

const contentDir = path.resolve(__dirname, "../../content");

function loadCurriculum() {
  const raw = JSON.parse(
    readFileSync(path.join(contentDir, "curriculo.json"), "utf8"),
  ) as {
    areas: Array<{
      slug: string;
      disciplines: Array<{ topics: CurriculoTopic[] }>;
    }>;
  };
  const topics: CurriculoTopic[] = [];
  const topicArea = new Map<string, string>();
  for (const area of raw.areas) {
    for (const discipline of area.disciplines) {
      for (const topic of discipline.topics) {
        topics.push(topic);
        topicArea.set(topic.slug, area.slug);
      }
    }
  }
  return { topics, topicArea };
}

function loadSeedQuestions(): SeedQuestion[] {
  const seedsDir = path.join(contentDir, "seeds");
  const files = ["questions-matematica.json", "questions-areas.json"] as const;
  return files.flatMap((file) => {
    const raw = JSON.parse(
      readFileSync(path.join(seedsDir, file), "utf8"),
    ) as { questions: SeedQuestion[] };
    return raw.questions;
  });
}

const { topics, topicArea } = loadCurriculum();
const topicBySlug = new Map(topics.map((t) => [t.slug, t]));
const seeds = loadSeedQuestions();

describe("registry ↔ catálogo de subtópicos (consistência estrutural)", () => {
  it("toda demo registrada declara ao menos um vínculo de subtópico", () => {
    for (const demoId of Object.keys(demoLoaders)) {
      const bound = demoSubtopicBindings[demoId];
      expect(
        bound,
        `demo "${demoId}" está registrada mas não tem vínculo com nenhum subtópico — demo sem subtópico nunca pode ser exibida (regra: vínculo por subtópico, nunca por tópico/área)`,
      ).toBeDefined();
      expect(bound.length, `demo "${demoId}" vincula-se a zero subtópicos`).toBeGreaterThan(0);
    }
  });

  it("todo vínculo aponta para uma demo registrada (loader existe)", () => {
    for (const [demoId, subtopics] of Object.entries(demoSubtopicBindings)) {
      expect(
        demoId in demoLoaders,
        `demo "${demoId}" está vinculada a [${subtopics.join(", ")}] mas não tem loader em demoLoaders`,
      ).toBe(true);
    }
  });

  it("todo demoId do catálogo existe no registry (nenhum subtópico aponta para demo fantasma)", () => {
    for (const [topicSlug, subs] of Object.entries(TOPIC_SUBTOPICS)) {
      for (const sub of subs) {
        if (!sub.demoId) continue;
        expect(
          sub.demoId in demoLoaders,
          `subtópico ${topicSlug}.${sub.slug} declara demo "${sub.demoId}", que não está registrada`,
        ).toBe(true);
      }
    }
  });

  it("todo tópico do catálogo existe no currículo", () => {
    for (const topicSlug of Object.keys(TOPIC_SUBTOPICS)) {
      expect(
        topicBySlug.has(topicSlug),
        `catálogo de subtópicos referencia tópico desconhecido "${topicSlug}"`,
      ).toBe(true);
    }
  });

  it("slugs locais de subtópicos são válidos e únicos dentro do tópico", () => {
    for (const [topicSlug, subs] of Object.entries(TOPIC_SUBTOPICS)) {
      const seen = new Set<string>();
      for (const sub of subs) {
        expect(sub.slug, `subtópico com slug vazio em ${topicSlug}`).toMatch(/^[a-z0-9-]+$/);
        expect(
          seen.has(sub.slug),
          `subtópico duplicado "${topicSlug}.${sub.slug}"`,
        ).toBe(false);
        seen.add(sub.slug);
      }
    }
  });
});

describe("regra de ÁREA (demo de área X nunca aparece em questão de área Y)", () => {
  it("cada demo é vinculada a subtópicos de uma ÚNICA área", () => {
    for (const [demoId, subtopics] of Object.entries(demoSubtopicBindings)) {
      const areas = new Set(
        subtopics.map((full) => topicArea.get(full.split(".")[0]) ?? `?? ${full}`),
      );
      expect(
        areas.size,
        `demo "${demoId}" mistura áreas: [${[...areas].join(", ")}] via [${subtopics.join(", ")}] — exatamente o bug da alavanca de FÍSICA dentro da matemática`,
      ).toBe(1);
    }
  });

  it("a área derivada do prefixo do slug confere com a área real do currículo", () => {
    for (const [slug, area] of topicArea) {
      expect(areaOfTopicSlug(slug), `prefixo de "${slug}" não casa a área "${area}"`).toBe(area);
    }
  });
});

describe("currículo: demo da lição do tópico ∈ demos dos seus subtópicos", () => {
  it("topics.demo_id é sempre a demo de um dos subtópicos do tópico", () => {
    for (const topic of topics) {
      const subs = TOPIC_SUBTOPICS[topic.slug];
      if (topic.demo_id === null) continue;
      expect(
        subs?.some((s) => s.demoId === topic.demo_id) ?? false,
        `tópico "${topic.slug}" aponta demo de lição "${topic.demo_id}", que não é demo de nenhum dos seus subtópicos`,
      ).toBe(true);
    }
  });

  it("tópico sem entrada no catálogo não pode ter demo de lição", () => {
    for (const topic of topics) {
      if (TOPIC_SUBTOPICS[topic.slug]) continue;
      expect(
        topic.demo_id,
        `tópico "${topic.slug}" tem demo_id "${topic.demo_id}" mas não tem subtópicos no catálogo — cadastre os subtópicos ou remova a demo`,
      ).toBeNull();
    }
  });
});

describe("questões seed exibem apenas a demo do PRÓPRIO subtópico", () => {
  it("todo subtópico declarado por uma questão existe no tópico dela", () => {
    for (const question of seeds) {
      if (!question.subtopic) continue;
      const sub = getSubtopic(question.topic_slug, question.subtopic);
      expect(
        sub,
        `questão "${question.statement_md.slice(0, 60)}…" declara subtópico "${question.subtopic}" que não existe em "${question.topic_slug}"`,
      ).not.toBeNull();
    }
  });

  it("o demo_id da questão é exatamente o resolvido do subtópico dela", () => {
    for (const question of seeds) {
      const resolution = resolveDemoForQuestion(
        question.topic_slug,
        question.subtopic ?? null,
        question.demo_params ?? null,
      );
      expect(
        question.demo_id ?? null,
        `questão "${question.statement_md.slice(0, 60)}…" carrega demo "${question.demo_id}", mas o subtópico "${question.subtopic}" resolve para "${resolution?.demoId ?? null}" — o demo_id é sempre derivado do subtópico`,
      ).toBe(resolution?.demoId ?? null);
    }
  });

  it("toda questão com demo exibe uma demo registrada e vinculada ao seu subtópico", () => {
    for (const question of seeds) {
      const displayed = question.demo_id ?? null;
      if (displayed === null) continue;
      expect(displayed in demoLoaders, `demo "${displayed}" não registrada`).toBe(true);
      const full = `${question.topic_slug}.${question.subtopic}`;
      expect(
        demoSubtopicBindings[displayed]?.includes(full),
        `questão "${question.statement_md.slice(0, 60)}…" exibiria "${displayed}", que não está vinculada ao subtópico "${full}" — é exatamente o bug da demo desligada do assunto`,
      ).toBe(true);
    }
  });

  it("questão sem subtópico (ou com subtópico sem demo) NÃO exibe demo nenhuma", () => {
    for (const question of seeds) {
      const resolution = resolveDemoForQuestion(
        question.topic_slug,
        question.subtopic ?? null,
      );
      if (!question.subtopic || !getSubtopic(question.topic_slug, question.subtopic)?.demoId) {
        expect(resolution).toBeNull();
        expect(question.demo_id ?? null).toBeNull();
      }
    }
  });
});

describe("regressões da auditoria (casos de teste do usuário)", () => {
  it("questão de ESCALA (4,5 cm, 1:200.000) exibe escala-mapa com os números da questão", () => {
    const q = seeds.find((s) => /escala do mapa é 1:200\.000/i.test(s.context_md ?? ""));
    expect(q, "questão de escala não encontrada nas seeds").toBeDefined();
    expect(q!.subtopic).toBe("escala");
    const resolution = resolveDemoForQuestion(q!.topic_slug, q!.subtopic, q!.demo_params ?? null);
    expect(resolution?.demoId).toBe("escala-mapa");
    expect(resolution?.params).toMatchObject({ distanceCm: 4.5, scale: 200000 });
    // nunca mais a antiga demo agrupada:
    expect(resolution?.demoId).not.toBe("razao-proporcao");
  });

  it("a antiga demo razao-proporcao (alavanca de física + arroz) não existe mais", () => {
    expect("razao-proporcao" in demoLoaders).toBe(false);
    expect(demoSubtopicBindings["razao-proporcao"]).toBeUndefined();
  });

  it("alavanca é uma demo de FÍSICA vinculada só a cn-mecanica.alavanca", () => {
    expect(demoSubtopicBindings["alavanca"]).toEqual(["cn-mecanica.alavanca"]);
    const area = topicArea.get("cn-mecanica");
    expect(area).toBe("cn");
  });

  it("questão de ABO (alelos múltiplos) NÃO exibe o quadro de Punnett monohíbrido", () => {
    const q = seeds.find((s) => s.topic_slug === "cn-genetica" && /grupo O/i.test(s.statement_md));
    expect(q?.subtopic).toBe("sistema-abo");
    expect(resolveDemoForQuestion(q!.topic_slug, q!.subtopic)).toBeNull();
  });

  it("questão de eutrofização exibe eutrofizacao (regressão do quadro de Punnett)", () => {
    const q = seeds.find((s) => s.topic_slug === "cn-ecologia");
    expect(q?.subtopic).toBe("eutrofizacao");
    expect(resolveDemoForQuestion(q!.topic_slug, q!.subtopic)?.demoId).toBe("eutrofizacao");
  });

  it("questão de combinatoria (senhas) NÃO exibe a árvore de probabilidades", () => {
    const q = seeds.find((s) => s.topic_slug === "mt-combinatoria");
    expect(q?.subtopic).toBe("principio-multiplicativo");
    expect(resolveDemoForQuestion(q!.topic_slug, q!.subtopic)).toBeNull();
  });

  it("questão do chuveiro elétrico exibe o PhET já na aba de circuitos", () => {
    const q = seeds.find((s) => /chuveiro/i.test(s.statement_md));
    expect(q?.subtopic).toBe("potencia-eletrica");
    const resolution = resolveDemoForQuestion(q!.topic_slug, q!.subtopic, q!.demo_params ?? null);
    expect(resolution?.demoId).toBe("phet");
    expect(resolution?.params).toMatchObject({ sim: "circuits" });
  });

  it("questões de história do Brasil NÃO exibem a linha do tempo de literatura", () => {
    const q = seeds.find((s) => s.topic_slug === "ch-brasil-republica");
    expect(q?.subtopic).toBe("era-vargas");
    expect(resolveDemoForQuestion(q!.topic_slug, q!.subtopic)).toBeNull();
  });
});
