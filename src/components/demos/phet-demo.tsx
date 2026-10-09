"use client";

import { useState } from "react";

/**
 * PhET simulations embedded from the official site (CC BY, University of
 * Colorado Boulder) with guiding questions beside each (doc section 12).
 * Aceita o parâmetro da questão `sim` (definido pelo SUBTÓPICO no catálogo
 * src/lib/demos/subtopics.ts) para abrir já na simulação certa — ex.: a
 * questão do chuveiro elétrico (cn-eletricidade.potencia-eletrica) abre em
 * circuitos, não em movimento.
 */
export interface PhetParams {
  sim?: "motion" | "circuits" | "waves";
}

const SIMULATIONS = [
  {
    id: "motion",
    title: "Energia de um skate",
    url: "https://phet.colorado.edu/sims/html/energy-skate-park/latest/energy-skate-park_pt_BR.html",
    questions: [
      "Em que ponto da pista a energia cinética é máxima? E a potencial?",
      "O que acontece com a altura máxima quando o atrito é ligado?",
    ],
  },
  {
    id: "circuits",
    title: "Circuitos elétricos",
    url: "https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_pt_BR.html",
    questions: [
      "O que acontece com o brilho da lâmpada ao adicionar outra em série? E em paralelo?",
      "Aumente a tensão da pilha: o que muda na corrente?",
    ],
  },
  {
    id: "waves",
    title: "Ondas",
    url: "https://phet.colorado.edu/sims/html/waves-intro/latest/waves-intro_pt_BR.html",
    questions: [
      "Aumente a frequência: o que acontece com o comprimento de onda?",
      "Amplitude maior muda o SOM como?",
    ],
  },
] as const;

const SIM_IDS = ["motion", "circuits", "waves"] as const;

type SimId = (typeof SIM_IDS)[number];

export function PhetDemo({ params }: { params?: PhetParams }) {
  const initial =
    params?.sim && (SIM_IDS as readonly string[]).includes(params.sim)
      ? (params.sim as SimId)
      : "motion";
  const [active, setActive] = useState<SimId>(initial);
  const sim = SIMULATIONS.find((s) => s.id === active) ?? SIMULATIONS[0];

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Simulações PhET"
        className="flex flex-wrap gap-2"
      >
        {SIMULATIONS.map((s) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={active === s.id}
            onClick={() => setActive(s.id)}
            className={
              active === s.id
                ? "rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                : "rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary/50"
            }
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_240px]">
        <div className="overflow-hidden rounded-xl border border-border">
          <iframe
            key={sim.url}
            src={sim.url}
            title={`Simulação PhET: ${sim.title}`}
            className="h-80 w-full md:h-96"
            loading="lazy"
            allowFullScreen
          />
        </div>
        <aside className="rounded-xl bg-muted/30 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Enquanto brinca, pergunte-se
          </p>
          <ul className="list-disc space-y-2 pl-4 text-sm">
            {sim.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </aside>
      </div>

      <p className="text-xs text-muted-foreground">
        Simulações PhET Interactive Simulations, Universidade de Colorado Boulder,
        licença CC BY 4.0, incorporadas do site oficial (docs/ATTRIBUTION.md).
      </p>
    </div>
  );
}
