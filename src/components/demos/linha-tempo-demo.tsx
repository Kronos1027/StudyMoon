"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Era {
  period: string;
  name: string;
  summary: string;
}

const TIMELINE: Era[] = [
  {
    period: "1500-1601",
    name: "Quinhentismo",
    summary: "Cartas e crônicas dos viajantes: a literatura como informação e propaganda da colônia.",
  },
  {
    period: "1601-1768",
    name: "Barroco",
    summary: "Dualidade fé × prazer, contradição e rebuscamento (Gregório de Matos, Vieira).",
  },
  {
    period: "1768-1836",
    name: "Arcadismo",
    summary: "Simplicidade, bucolismo, 'carpe diem' e crítica colonial (Gonzaga, Basílio da Gama).",
  },
  {
    period: "1836-1881",
    name: "Romantismo",
    summary: "Nacionalismo, indianismo, sentimentalismo em três gerações (Gonçalves Dias, Álvares de Azevedo, Castro Alves).",
  },
  {
    period: "1881-1893",
    name: "Realismo/ Naturalismo",
    summary: "Objetividade e crítica social (Machado de Assis, Aluísio Azevedo).",
  },
  {
    period: "1893-1902",
    name: "Simbolismo",
    summary: "Misticismo, sugestão e musicalidade (Cruz e Sousa).",
  },
  {
    period: "1922-1945",
    name: "Modernismo",
    summary: "Ruptura com o passado, verso livre, linguagem coloquial (Semana de 22 e seguidores).",
  },
  {
    period: "1945-hoje",
    name: "Contemporânea",
    summary: "Experimentalismo e diversidade: de Guimarães Rosa a Conceição Evaristo.",
  },
];

/**
 * Interactive timeline: eras light up on selection with a summary
 * (doc section 12: Geografia e História — linhas do tempo).
 */
export function LinhaTempoDemo() {
  const [selected, setSelected] = useState<number | null>(null);
  const reduced = useReducedMotion();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        Linha do tempo da literatura brasileira — toque em um marco
      </h3>

      <div className="overflow-x-auto scroll-moon pb-3">
        <div className="relative flex min-w-max items-start gap-0 pt-8" role="list">
          {TIMELINE.map((era, i) => (
            <div key={era.name} role="listitem" className="relative">
              <button
                onClick={() => setSelected(selected === i ? null : i)}
                className="group relative z-10 mx-1 flex flex-col items-center"
                aria-pressed={selected === i}
                aria-label={`${era.name} (${era.period})`}
              >
                <motion.span
                  className={cn(
                    "mb-1 rounded-full border-2 px-2 py-0.5 text-[11px] font-medium transition-colors",
                    selected === i
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground group-hover:border-primary/60",
                  )}
                  animate={reduced ? undefined : { scale: selected === i ? 1.08 : 1 }}
                >
                  {era.period}
                </motion.span>
                <span
                  className={cn(
                    "h-4 w-4 rounded-full border-2 transition-colors",
                    selected === i
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/50 bg-card group-hover:border-primary/60",
                  )}
                />
              </button>
              {/* connector */}
              {i < TIMELINE.length - 1 ? (
                <span className="absolute left-1/2 top-[52px] h-0.5 w-8 translate-x-full bg-border" aria-hidden="true" />
              ) : null}
              <span className="mt-2 block w-24 text-center text-xs text-muted-foreground">
                {era.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {selected !== null ? (
        <motion.div
          className="rounded-xl border border-border bg-card p-4"
          initial={reduced ? undefined : { opacity: 0, y: 8 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          role="status"
        >
          <p className="font-semibold">
            {TIMELINE[selected].name}{" "}
            <span className="font-normal text-muted-foreground">
              ({TIMELINE[selected].period})
            </span>
          </p>
          <p className="mt-1 text-sm">{TIMELINE[selected].summary}</p>
        </motion.div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Cada marco mostra um resumo do movimento literário.
        </p>
      )}
    </div>
  );
}
