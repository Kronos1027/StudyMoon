"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  punnettCross,
  punnettCounts,
  type Genotype,
} from "@/lib/demos/models";

function phenotype(g: Genotype): "vermelha" | "branca" {
  return g.includes("V") ? "vermelha" : "branca";
}

type Cross = "VV" | "Vv" | "vv";

const GENOTYPES: Cross[] = ["VV", "Vv", "vv"];

/**
 * Genetics simulator: interactive Punnett square with selectable parents
 * (doc section 12: genética com quadro de Punnett).
 * Cálculo (gametas, contagens e percentuais) vem de src/lib/demos/models.ts
 * (testado). Vinculada só a cn-genetica.cruzamentos — nunca à área.
 */
export function GeneticaDemo() {
  const [parentA, setParentA] = useState<Cross>("Vv");
  const [parentB, setParentB] = useState<Cross>("Vv");
  const reduced = useReducedMotion();

  const grid = punnettCross(parentA, parentB);
  const { whitePct, redPct } = punnettCounts(parentA, parentB);
  const white = grid.filter((g) => g === "vv").length;
  const red = 4 - white;

  return (
    <div className="space-y-6">
      <section aria-label="Quadro de Punnett interativo">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">
          Escolha os genótipos dos pais (V = vermelha dominante, v = branca)
        </h3>

        <div className="mb-5 flex flex-wrap items-center justify-center gap-6">
          <ParentPicker label="Planta 1" value={parentA} onChange={setParentA} />
          <span className="text-2xl text-muted-foreground">×</span>
          <ParentPicker label="Planta 2" value={parentB} onChange={setParentB} />
        </div>

        <div className="flex justify-center">
          <table className="border-collapse" aria-label="Quadro de Punnett">
            <thead>
              <tr>
                <th className="p-2" />
                {parentB.split("").map((g, i) => (
                  <th key={i} className="p-2 text-lg font-semibold text-muted-foreground">
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parentA.split("").map((ga, i) => (
                <tr key={i}>
                  <th className="p-2 text-lg font-semibold text-muted-foreground">{ga}</th>
                  {parentB.split("").map((_gb, j) => {
                    const g = grid[i * 2 + j];
                    return (
                      <motion.td
                        key={j}
                        className={cn(
                          "m-1 h-16 w-20 rounded-lg border-2 text-center align-middle",
                          phenotype(g) === "vermelha"
                            ? "border-primary/40 bg-primary/10"
                            : "border-border bg-muted/40",
                        )}
                        initial={reduced ? undefined : { opacity: 0, scale: 0.8 }}
                        animate={reduced ? undefined : { opacity: 1, scale: 1 }}
                        transition={{ delay: (i * 2 + j) * 0.06 }}
                      >
                        <span className="block font-mono text-base font-semibold">{g}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          {phenotype(g)}
                        </span>
                      </motion.td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-primary/10 p-3">
            <p className="text-xs text-muted-foreground">Flores vermelhas</p>
            <p className="text-2xl font-semibold text-primary tabular-nums">
              {red}/4 = {redPct.toString().replace(".", ",")}%
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Flores brancas (vv)</p>
            <p className="text-2xl font-semibold tabular-nums">
              {white}/4 = {whitePct.toString().replace(".", ",")}%
            </p>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          {parentA === "Vv" && parentB === "Vv"
            ? "O cruzamento clássico de Mendel: 3:1 no fenótipo."
            : parentA === "VV" || parentB === "VV"
              ? "Com um pai VV, todos os descendentes são vermelhos — mas podem carregar o alelo v."
              : "Teste outros genótipos para ver as proporções mudarem."}
        </p>
      </section>
    </div>
  );
}

function ParentPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Cross;
  onChange: (v: Cross) => void;
}) {
  return (
    <div className="text-center">
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      <div role="radiogroup" aria-label={label} className="flex overflow-hidden rounded-lg border border-border">
        {GENOTYPES.map((g) => (
          <button
            key={g}
            role="radio"
            aria-checked={value === g}
            onClick={() => onChange(g)}
            className={cn(
              "px-4 py-2 font-mono text-sm font-semibold transition-colors",
              value === g
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  );
}
