"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { divisionWithRemainder } from "@/lib/demos/models";

/**
 * Division simulator: grouping objects into boxes (doc section 12).
 * Shows quotient, remainder (different color) and the math behind it.
 */
export function DivisaoDemo() {
  const [total, setTotal] = useState(14);
  const [boxSize, setBoxSize] = useState(4);
  const reduced = useReducedMotion();

  const { quotient, remainder } = divisionWithRemainder(total, boxSize);
  const boxes = Array.from({ length: quotient }, (_, i) =>
    Array.from({ length: boxSize }, (_, j) => i * boxSize + j),
  );

  return (
    <div className="space-y-6">
      <section aria-label="Divisão como agrupamento em caixas">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {total} objetos em caixas de {boxSize}
          </h3>
          <p className="rounded-lg bg-card px-3 py-1 font-mono text-sm">
            {total} ÷ {boxSize} ={" "}
            <strong className="text-accent-1-ink">{quotient}</strong>
            {remainder > 0 ? (
              <>
                {" "}resto{" "}
                <strong className="text-destructive">{remainder}</strong>
              </>
            ) : null}
          </p>
        </div>

        <div className="space-y-3" role="img" aria-label={`${quotient} caixas cheias de ${boxSize} objetos${remainder > 0 ? ` e ${remainder} objetos sobrando` : ""}`}>
          {boxes.map((box, boxIndex) => (
            <motion.div
              key={boxIndex}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 p-3"
              initial={reduced ? undefined : { opacity: 0, y: 10 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: boxIndex * 0.08 }}
            >
              <span className="text-xs font-medium text-muted-foreground">
                caixa {boxIndex + 1}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {box.map((item) => (
                  <span
                    key={item}
                    className="h-6 w-6 rounded-md bg-brand-gradient"
                    aria-label={`objeto ${item + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          ))}
          {remainder > 0 ? (
            <motion.div
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-destructive/50 bg-destructive/5 p-3"
              initial={reduced ? undefined : { opacity: 0 }}
              animate={reduced ? undefined : { opacity: 1 }}
              transition={{ delay: quotient * 0.08 }}
            >
              <span className="text-xs font-medium text-destructive">
                sobra (resto)
              </span>
              <div className="flex gap-1.5">
                {Array.from({ length: remainder }, (_, i) => (
                  <span
                    key={i}
                    className="h-6 w-6 rounded-md bg-destructive/70"
                    aria-label={`objeto restante ${i + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <p className="rounded-xl bg-success/10 p-3 text-sm text-success">
              Divisão exata: nada sobra — o resto é 0.
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="div-total" className="text-xs text-muted-foreground">
              Total de objetos: <strong className="text-foreground">{total}</strong>
            </label>
            <Slider
              id="div-total"
              value={[total]}
              onValueChange={([v]) => setTotal(v)}
              min={1}
              max={30}
              step={1}
              aria-label="Total de objetos"
            />
          </div>
          <div>
            <label htmlFor="div-size" className="text-xs text-muted-foreground">
              Tamanho da caixa (divisor): <strong className="text-foreground">{boxSize}</strong>
            </label>
            <Slider
              id="div-size"
              value={[boxSize]}
              onValueChange={([v]) => setBoxSize(Math.max(1, v))}
              min={1}
              max={8}
              step={1}
              aria-label="Objetos por caixa"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          O resto é sempre menor que o divisor — se sobrasse {boxSize} ou mais,
          caberia mais uma caixa.
        </p>
      </section>
    </div>
  );
}
