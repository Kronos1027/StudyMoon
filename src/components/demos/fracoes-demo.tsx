"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { equivalentFractions } from "@/lib/demos/models";

/**
 * Fractions simulator: bars that split into equal parts, with equivalences.
 * Slider picks the fraction (numerator/denominator); the bar animates the
 * split and shows two equivalent fractions.
 */
export function FracoesDemo() {
  const [denominator, setDenominator] = useState(4);
  const [numerator, setNumerator] = useState(3);
  const reduced = useReducedMotion();

  const clampedNumerator = Math.min(numerator, denominator);
  const equivalents = equivalentFractions(clampedNumerator, denominator, 24);

  return (
    <div className="space-y-6">
      <section aria-label="Fração como parte do todo">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            A fração pinta as partes escolhidas
          </h3>
          <span className="text-2xl font-semibold text-accent-1-ink">
            <span className="tabular-nums">{clampedNumerator}</span>
            <span className="mx-1 text-muted-foreground">/</span>
            <span className="tabular-nums">{denominator}</span>
          </span>
        </div>

        <div
          className="flex h-16 w-full overflow-hidden rounded-xl border border-border"
          role="img"
          aria-label={`Barra dividida em ${denominator} partes, ${clampedNumerator} pintadas`}
        >
          {Array.from({ length: denominator }, (_, i) => {
            const on = i < clampedNumerator;
            return (
              <motion.div
                key={`${denominator}-${i}`}
                className={cn(
                  "flex-1 border-r border-border last:border-r-0",
                  on ? "bg-brand-gradient" : "bg-muted",
                )}
                initial={reduced ? undefined : { opacity: 0, scaleY: 0.6 }}
                animate={reduced ? undefined : { opacity: 1, scaleY: 1 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
              />
            );
          })}
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="frac-den" className="text-xs text-muted-foreground">
              Em quantas partes dividir o todo: <strong className="text-foreground">{denominator}</strong>
            </label>
            <Slider
              id="frac-den"
              value={[denominator]}
              onValueChange={([v]) => {
                setDenominator(v);
                setNumerator((n) => Math.min(n, v));
              }}
              min={2}
              max={12}
              step={1}
              aria-label="Denominador da fração"
            />
          </div>
          <div>
            <label htmlFor="frac-num" className="text-xs text-muted-foreground">
              Quantas partes pintar: <strong className="text-foreground">{clampedNumerator}</strong>
            </label>
            <Slider
              id="frac-num"
              value={[clampedNumerator]}
              onValueChange={([v]) => setNumerator(v)}
              min={0}
              max={denominator}
              step={1}
              aria-label="Numerador da fração"
            />
          </div>
        </div>
      </section>

      {equivalents.length > 0 ? (
        <section aria-label="Frações equivalentes">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Frações equivalentes (mesma quantidade pintada)
          </h3>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-lg bg-primary/10 px-4 py-2 text-xl font-semibold text-primary tabular-nums">
              {clampedNumerator}/{denominator}
            </span>
            {equivalents.map((f) => (
              <span
                key={`${f.n}/${f.d}`}
                className="rounded-lg border border-border px-4 py-2 text-xl font-semibold tabular-nums"
              >
                {f.n}/{f.d}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Multiplicar numerador e denominador pelo mesmo número não muda a
            quantidade — só o tamanho das fatias.
          </p>
        </section>
      ) : null}
    </div>
  );
}
