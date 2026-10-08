"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Equation balancing: drag-free "atom rearrangement" — adjust coefficients
 * until both sides have equal atoms (doc section 12).
 */

export function BalanceamentoDemo() {
  const [coefA, setCoefA] = useState(1); // H2
  const [coefB, setCoefB] = useState(1); // O2
  const [coefC, setCoefC] = useState(1); // H2O
  const reduced = useReducedMotion();

  const leftH = coefA * 2;
  const leftO = coefB * 2;
  const rightH = coefC * 2;
  const rightO = coefC * 1;
  const balanced = leftH === rightH && leftO === rightO;

  function reset() {
    setCoefA(1);
    setCoefB(1);
    setCoefC(1);
  }

  return (
    <div className="space-y-6">
      <section aria-label="Balanceamento de equações">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">
          Ajuste os coeficientes até os átomos se equilibrarem
        </h3>

        <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl bg-muted/20 p-5 font-mono text-xl">
          <CoefStepper value={coefA} onChange={setCoefA} label="coeficiente de H₂" />
          <span>H₂</span>
          <span className="text-muted-foreground">+</span>
          <CoefStepper value={coefB} onChange={setCoefB} label="coeficiente de O₂" />
          <span>O₂</span>
          <span className="mx-2 text-accent-1-ink">→</span>
          <CoefStepper value={coefC} onChange={setCoefC} label="coeficiente de H₂O" />
          <span>H₂O</span>
        </div>

        {/* Atom counts */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border p-4">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Antes da seta (reagentes)
            </p>
            <AtomRow element="H" count={leftH} target={rightH} />
            <AtomRow element="O" count={leftO} target={rightO} />
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Depois da seta (produtos)
            </p>
            <AtomRow element="H" count={rightH} target={leftH} />
            <AtomRow element="O" count={rightO} target={leftO} />
          </div>
        </div>

        {balanced ? (
          <motion.div
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-success/10 p-4 text-success"
            initial={reduced ? undefined : { scale: 0.95, opacity: 0 }}
            animate={reduced ? undefined : { scale: 1, opacity: 1 }}
          >
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <p className="font-medium">
              Equilibrada! 2H₂ + O₂ → 2H₂O — a mesma quantidade de átomos entra e sai.
            </p>
          </motion.div>
        ) : (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>Átomos não podem aparecer nem sumir — ajuste os coeficientes.</p>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Recomeçar
            </Button>
          </div>
        )}

        <div className="mt-2 flex flex-wrap justify-center gap-1.5" aria-hidden="true">
          {Array.from({ length: Math.min(12, leftH) }, (_, i) => (
            <motion.span
              key={`h-${i}`}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary"
              animate={reduced ? undefined : { y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: i * 0.1 }}
            >
              H
            </motion.span>
          ))}
          {Array.from({ length: Math.min(12, leftO) }, (_, i) => (
            <motion.span
              key={`o-${i}`}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-2/20 text-xs font-bold text-accent-2-ink"
              animate={reduced ? undefined : { y: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, delay: i * 0.12 }}
            >
              O
            </motion.span>
          ))}
        </div>
      </section>
    </div>
  );
}

function CoefStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <span className="inline-flex flex-col items-center">
      <button
        className="rounded px-2 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => onChange(Math.min(6, value + 1))}
        aria-label={`Aumentar ${label}`}
      >
        ▲
      </button>
      <button
        className={cn(
          "rounded-md px-2.5 py-0.5 font-sans font-bold",
          value > 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label={`Diminuir ${label}`}
        title={`coeficiente atual: ${value}`}
      >
        {value}
      </button>
      <button
        className="rounded px-2 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label={`Diminuir ${label}`}
      >
        ▼
      </button>
    </span>
  );
}

function AtomRow({ element, count, target }: { element: string; count: number; target: number }) {
  return (
    <p className="flex items-center justify-between text-sm">
      <span className="font-mono font-semibold">{element}</span>
      <span
        className={cn(
          "rounded-md px-2 py-0.5 tabular-nums",
          count === target ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive",
        )}
      >
        {count} {count !== target ? `(alvo: ${target})` : "✓"}
      </span>
    </p>
  );
}
