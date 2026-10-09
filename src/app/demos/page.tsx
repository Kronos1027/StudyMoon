import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { DemoFrame } from "@/components/demos/demo-frame";
import { demoLoaders } from "@/components/demos/registry";
import { resolveDemoForQuestion } from "@/lib/demos/subtopics";
import { QuestionFixture } from "./question-fixture";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galeria de simuladores (auditoria)",
  robots: { index: false, follow: false },
};

/**
 * Galeria interna de simuladores (PASSO 5 da auditoria) — página de
 * referência para E2E do Playwright e inspeção visual:
 *
 *  1. Resolução demo ↔ subtópico de CADA questão seed (pelo mesmo
 *     resolvedor usado em produção — src/lib/demos/subtopics.ts).
 *  2. Cada simulador registrado em dois estados (padrão e extremo,
 *     quando aceita parâmetros).
 *  3. Fluxo real de questão (QuestionCard de produção) por subtópico
 *     com demo — a action é injetada (fixture), o resto é o componente
 *     usado pelo estudante.
 *
 * Rota noindex; sem dados sensíveis (conteúdo das seeds é público).
 */

interface SeedQuestion {
  topic_slug: string;
  statement_md: string;
  context_md: string | null;
  alternatives: Array<{ key: "A" | "B" | "C" | "D" | "E"; text: string }>;
  answer_key: "A" | "B" | "C" | "D" | "E";
  explanation_md: string;
  hints: string[];
  subtopic: string | null;
  demo_params?: Record<string, string | number | boolean> | null;
  demo_id: string | null;
}

async function loadSeeds(): Promise<SeedQuestion[]> {
  const seedsDir = path.join(process.cwd(), "content", "seeds");
  const files = ["questions-matematica.json", "questions-areas.json"];
  const out: SeedQuestion[] = [];
  for (const file of files) {
    const raw = JSON.parse(await readFile(path.join(seedsDir, file), "utf8")) as {
      questions: SeedQuestion[];
    };
    out.push(...raw.questions);
  }
  return out;
}

/** Estados padrão/extremo por demo (parâmetros aceitos pelo componente). */
const GALLERY_STATES: Record<string, { standard?: Record<string, unknown>; extreme?: Record<string, unknown> }> = {
  "escala-mapa": {
    standard: { distanceCm: 4.5, scale: 200000 },
    extreme: { distanceCm: 20, scale: 1000000 },
  },
  phet: { standard: { sim: "circuits" }, extreme: { sim: "waves" } },
};

export default async function DemosGalleryPage() {
  const seeds = await loadSeeds();

  const resolutions = seeds
    .map((q) => ({
      q,
      resolution: resolveDemoForQuestion(q.topic_slug, q.subtopic, q.demo_params ?? null),
    }))
    .filter(({ q, resolution }) => q.subtopic !== null || resolution !== null);

  const withDemo = resolutions.filter(({ resolution }) => resolution !== null);
  const demoIds = Object.keys(demoLoaders).sort();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Galeria de simuladores — auditoria
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Página interna (noindex) usada pelos testes E2E do PASSO 5: resolução
          demo ↔ subtópico de cada questão, cada simulador em estados padrão e
          extremo, e o fluxo real de questão por subtópico. O vínculo é por
          subtópico — questão sem subtópico com simulador não mostra demo.
        </p>
      </header>

      {/* 1. Resolução demo ↔ subtópico por questão seed */}
      <section aria-label="Resolução demo por subtópico" className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          1 · Resolução demo ↔ subtópico ({withDemo.length} de {seeds.length} questões com demo)
        </h2>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {resolutions.map(({ q, resolution }, i) => (
            <li
              key={i}
              data-resolution-row
              data-topic={q.topic_slug}
              data-subtopic={q.subtopic ?? ""}
              data-demo={resolution?.demoId ?? ""}
              data-params={JSON.stringify(resolution?.params ?? {})}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs"
            >
              <span className="font-mono">
                {q.topic_slug}
                {q.subtopic ? `.${q.subtopic}` : ""}
              </span>
              <span className="mx-2 text-muted-foreground">→</span>
              <span className="font-semibold">{resolution?.demoId ?? "— sem demo —"}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 2. Cada simulador, estados padrão e extremo */}
      <section aria-label="Galeria de simuladores" className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          2 · Simuladores ({demoIds.length})
        </h2>
        <div className="space-y-6">
          {demoIds.map((demoId) => {
            const states = GALLERY_STATES[demoId] ?? {};
            return (
              <div key={demoId} data-demo-gallery-item={demoId}>
                <h3 className="mb-2 font-mono text-sm font-semibold">{demoId}</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  {(["standard", "extreme"] as const).map((state) =>
                    states[state] !== undefined || state === "standard" ? (
                      <div
                        key={state}
                        data-demo-frame={demoId}
                        data-state={state}
                        className="overflow-hidden rounded-xl border border-border p-3"
                      >
                        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                          {state === "standard" ? "estado padrão" : "estado extremo"}
                          {states[state] ? ` · ${JSON.stringify(states[state])}` : ""}
                        </p>
                        <DemoFrame demoId={demoId} params={states[state]} />
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Fluxo real de questão por subtópico com demo */}
      <section aria-label="Fluxo de questão por subtópico">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          3 · Fluxo de questão (QuestionCard real, action injetada)
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Responda ERRADO para ver a resolução e o simulador do subtópico
          (&ldquo;Veja o conceito em movimento&rdquo;).
        </p>
        <div className="space-y-10">
          {withDemo.map(({ q, resolution }, i) => (
            <QuestionFixture
              key={`fixture-${i}`}
              answerKey={q.answer_key}
              explanation={q.explanation_md}
              question={{
                id: `fixture-${i}`,
                topic_id: "fixture",
                subtopic: q.subtopic,
                difficulty: 1000,
                context_md: q.context_md,
                statement_md: q.statement_md,
                alternatives: q.alternatives,
                hints: q.hints,
                demo_id: resolution?.demoId ?? null,
                demo_params: (resolution?.params ?? null) as Record<
                  string,
                  string | number | boolean
                > | null,
                status: "validated",
                source: "fixture",
                license: null,
                origin: "seed",
                created_at: new Date().toISOString(),
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
