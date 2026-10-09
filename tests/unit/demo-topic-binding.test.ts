import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { demoLoaders, demoTopicBindings } from "@/components/demos/registry";

/**
 * Regression guard for the bug "Veja o conceito em movimento aparece desligado
 * do assunto da questão" (a eutrophication question displayed the Punnett
 * square simulator, because demos used to be bound to the AREA instead of the
 * topic).
 *
 * The display path resolves the demo from the question's own topic
 * (topics.demo_id, joined in the data layer), so a question can only ever
 * display its topic's demo. These tests lock the full chain:
 *   question → topic → demo registered → demo bound to that topic.
 */

interface CurriculoTopic {
  slug: string;
  demo_id: string | null;
}
interface SeedQuestion {
  topic_slug: string;
  statement_md: string;
  demo_id: string | null;
}

const contentDir = path.resolve(__dirname, "../../content");

function loadCurriculoTopics(): CurriculoTopic[] {
  const raw = JSON.parse(
    readFileSync(path.join(contentDir, "curriculo.json"), "utf8"),
  ) as {
    areas: Array<{
      disciplines: Array<{ topics: CurriculoTopic[] }>;
    }>;
  };
  return raw.areas.flatMap((area) =>
    area.disciplines.flatMap((discipline) => discipline.topics),
  );
}

function loadSeedQuestions(): SeedQuestion[] {
  const seedsDir = path.join(contentDir, "seeds");
  const files = [
    "questions-matematica.json",
    "questions-areas.json",
  ] as const;
  return files.flatMap((file) => {
    const raw = JSON.parse(readFileSync(path.join(seedsDir, file), "utf8")) as {
      questions: SeedQuestion[];
    };
    return raw.questions;
  });
}

const topics = loadCurriculoTopics();
const topicBySlug = new Map(topics.map((t) => [t.slug, t]));
const seeds = loadSeedQuestions();

describe("demo registry ↔ topic bindings", () => {
  it("every registered demo declares at least one topic binding", () => {
    for (const demoId of Object.keys(demoLoaders)) {
      const bound = demoTopicBindings[demoId];
      expect(
        bound,
        `demo "${demoId}" is registered but has no topic binding — a demo without a topic can never be displayed (rule: topic-bound, never area-bound)`,
      ).toBeDefined();
      expect(bound.length, `demo "${demoId}" binds to zero topics`).toBeGreaterThan(0);
    }
  });

  it("every topic binding references a registered demo loader", () => {
    for (const [demoId, topicSlugs] of Object.entries(demoTopicBindings)) {
      expect(
        demoId in demoLoaders,
        `demo "${demoId}" is bound to [${topicSlugs.join(", ")}] but has no loader in demoLoaders`,
      ).toBe(true);
    }
  });

  it("every binding entry is a real curriculum topic slug", () => {
    for (const [demoId, topicSlugs] of Object.entries(demoTopicBindings)) {
      for (const slug of topicSlugs) {
        expect(
          topicBySlug.has(slug),
          `demo "${demoId}" binds to unknown topic slug "${slug}"`,
        ).toBe(true);
      }
    }
  });
});

describe("curriculum demo_id ↔ registry bindings", () => {
  it("a topic with a demo references a registered demo bound to that exact topic", () => {
    for (const topic of topics) {
      if (topic.demo_id === null) continue;
      expect(
        topic.demo_id in demoLoaders,
        `topic "${topic.slug}" references demo "${topic.demo_id}", which is not registered`,
      ).toBe(true);
      expect(
        demoTopicBindings[topic.demo_id]?.includes(topic.slug),
        `topic "${topic.slug}" references demo "${topic.demo_id}", but that demo is not bound to this topic (demoTopicBindings["${topic.demo_id}"] = [${(demoTopicBindings[topic.demo_id] ?? []).join(", ")}])`,
      ).toBe(true);
    }
  });

  it("a topic without a demo is not bound to any demo in the registry", () => {
    for (const topic of topics) {
      if (topic.demo_id !== null) continue;
      const owners = Object.entries(demoTopicBindings)
        .filter(([, slugs]) => slugs.includes(topic.slug))
        .map(([demoId]) => demoId);
      expect(
        owners,
        `topic "${topic.slug}" has demo_id null in the curriculum, but demo(s) [${owners.join(", ")}] still bind to it — either give the topic its dedicated simulator or remove the binding (better no demo than a wrong demo)`,
      ).toEqual([]);
    }
  });

  it("no demo is bound to a topic whose curriculum points elsewhere", () => {
    for (const [demoId, topicSlugs] of Object.entries(demoTopicBindings)) {
      for (const slug of topicSlugs) {
        expect(
          topicBySlug.get(slug)?.demo_id,
          `demo "${demoId}" binds to topic "${slug}", but the curriculum assigns demo "${topicBySlug.get(slug)?.demo_id}" to it`,
        ).toBe(demoId);
      }
    }
  });
});

describe("seed questions display only their own topic's demo", () => {
  it("every seed question's demo_id equals its topic's demo_id", () => {
    for (const question of seeds) {
      const topic = topicBySlug.get(question.topic_slug);
      expect(topic, `seed question references unknown topic "${question.topic_slug}"`).toBeDefined();
      expect(
        question.demo_id,
        `seed question "${question.statement_md.slice(0, 60)}..." (topic ${question.topic_slug}) carries demo "${question.demo_id}", but its topic's demo is "${topic?.demo_id}" — a question must only carry its own topic's demo (bug: eutrofização showing quadro de Punnett)`,
      ).toBe(topic?.demo_id ?? null);
    }
  });

  it("no seed question displays a simulator bound to a different topic", () => {
    // This mirrors the runtime display path: the demo shown with a question
    // is resolved from the question's topic (topics.demo_id), then the demo
    // must be registered and bound to that topic.
    for (const question of seeds) {
      const topic = topicBySlug.get(question.topic_slug);
      const displayedDemo = topic?.demo_id ?? null;
      if (displayedDemo === null) continue; // no simulator → no demo shown
      expect(
        displayedDemo in demoLoaders,
        `question "${question.statement_md.slice(0, 60)}..." would display demo "${displayedDemo}", which is not registered`,
      ).toBe(true);
      expect(
        demoTopicBindings[displayedDemo]?.includes(question.topic_slug),
        `question "${question.statement_md.slice(0, 60)}..." (topic ${question.topic_slug}) would display demo "${displayedDemo}", which is bound to other topics only — this is exactly the "demo desligada do assunto" bug`,
      ).toBe(true);
    }
  });

  it("the eutrophication question shows the eutrofizacao simulator, not the Punnett square (regression)", () => {
    const eutrofizacaoQuestions = seeds.filter(
      (q) =>
        q.topic_slug === "cn-ecologia" &&
        /eutrofiz/i.test(q.statement_md + (q.demo_id ?? "")),
    );
    expect(eutrofizacaoQuestions.length).toBeGreaterThan(0);
    for (const question of eutrofizacaoQuestions) {
      expect(question.demo_id).toBe("eutrofizacao");
      expect(question.demo_id).not.toBe("genetica");
    }
  });
});
