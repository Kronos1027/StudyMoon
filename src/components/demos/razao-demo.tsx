"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { areProportional, ratioValue, simplifyRatio } from "@/lib/demos/models";

/**
 * Simulador de RAZÃO E PROPORÇÃO (PASSO 2 — demo "razao-proporcao" dividida).
 * Uma receita (açúcar : farinha) mostra a razão como partes do todo; dobrar
 * a receita mantém a proporção. Toda conta vem de src/lib/demos/models.ts.
 */
const MAX_PARTS = 10;
const MAX_BATCHES = 6;

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function RazaoDemo() {
  const [sugar, setSugar] = useState(2);
  const [flour, setFlour] = useState(3);
  const [batches, setBatches] = useState(2);
  const reduced = useReducedMotion();

  const simple = simplifyRatio(sugar, flour);
  const ratio = ratioValue(sugar, flour);
  const scaledSugar = sugar * batches;
  const scaledFlour = flour * batches;
  const proportional = areProportional(sugar, flour, scaledSugar, scaledFlour); // sempre true aqui: a receita escala junta
  const totalParts = scaledSugar + scaledFlour;
  const sugarShare = ratio !== null ? (scaledSugar / totalParts) * 100 : null;

  return (
    <div className="space-y-6">
      <section aria-label="Receita com razão entre ingredientes">
        <h3 className="mb-1 text-sm font-medium text-muted-foreground">
          A razão da receita: {sugar} parte{sugar === 1 ? "" : "s"} de açúcar para {flour} de farinha
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Razão {sugar} : {flour} {simple.b > 0 && (simple.a !== sugar || simple.b !== flour)
            ? `(simplificada: ${simple.a} : ${simple.b})`
            : ""}
          {ratio !== null ? ` · valor da razão ${sugar} ÷ ${flour} = ${fmt(ratio)}` : ""}
        </p>

        <div
          className="flex items-end justify-center gap-6 sm:gap-10"
          role="img"
          aria-label={`Balança de ingredientes: ${scaledSugar} blocos de açúcar para ${scaledFlour} blocos de farinha em ${batches} receita${batches === 1 ? "" : "s"}.`}
        >
          <IngredientColumn
            label="Açúcar"
            parts={scaledSugar}
            max={MAX_PARTS * MAX_BATCHES}
            tone="bg-primary"
            reduced={reduced}
          />
          <span className="pb-10 text-2xl font-semibold text-muted-foreground" aria-hidden="true">
            :
          </span>
          <IngredientColumn
            label="Farinha"
            parts={scaledFlour}
            max={MAX_PARTS * MAX_BATCHES}
            tone="bg-accent-2"
            reduced={reduced}
          />
        </div>

        <p aria-live="polite"
          className={cn(
            "mt-4 rounded-xl p-3 text-center text-sm font-medium",
            proportional ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {proportional
            ? `${batches}× a receita usa ${scaledSugar} : ${scaledFlour} — a mesma proporção de ${sugar} : ${flour}.`
            : "Ajuste os ingredientes."}
          {sugarShare !== null
            ? ` O açúcar é sempre ${fmt(sugarShare)}% da mistura.`
            : ""}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="razao-acucar" className="text-xs text-muted-foreground">
              Açúcar (partes): <strong className="text-foreground">{sugar}</strong>
            </label>
            <Slider
              id="razao-acucar"
              value={[sugar]}
              onValueChange={([v]) => setSugar(v)}
              min={1}
              max={MAX_PARTS}
              step={1}
              aria-label="Partes de açúcar na receita"
            />
          </div>
          <div>
            <label htmlFor="razao-farinha" className="text-xs text-muted-foreground">
              Farinha (partes): <strong className="text-foreground">{flour}</strong>
            </label>
            <Slider
              id="razao-farinha"
              value={[flour]}
              onValueChange={([v]) => setFlour(v)}
              min={1}
              max={MAX_PARTS}
              step={1}
              aria-label="Partes de farinha na receita"
            />
          </div>
          <div>
            <label htmlFor="razao-receitas" className="text-xs text-muted-foreground">
              Receitas: <strong className="text-foreground">{batches}×</strong>
            </label>
            <Slider
              id="razao-receitas"
              value={[batches]}
              onValueChange={([v]) => setBatches(v)}
              min={1}
              max={MAX_BATCHES}
              step={1}
              aria-label="Quantidade de receitas"
            />
          </div>
        </div>
      </section>

      <section aria-label="Proporção entre duas razões">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Proporção: duas razões iguais
        </h3>
        <div className="mx-auto w-full max-w-md rounded-xl border border-border p-4 font-mono text-sm">
          <p className="text-center tabular-nums">
            {sugar} : {flour} &nbsp;=&nbsp; {scaledSugar} : {scaledFlour}
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {sugar} × {flour === 0 ? "—" : `${scaledFlour}`} = {sugar * scaledFlour} &nbsp;·&nbsp;{" "}
            {flour} × {scaledSugar} = {flour * scaledSugar}
          </p>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Numa proporção, o produto dos meios é igual ao produto dos extremos —
          é isso que a regra de três explora.
        </p>
      </section>
    </div>
  );
}

function IngredientColumn({
  label,
  parts,
  max,
  tone,
  reduced,
}: {
  label: string;
  parts: number;
  max: number;
  tone: string;
  reduced: boolean | null;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-2xl font-semibold tabular-nums">{parts}</span>
      <div className="flex h-40 w-16 flex-col-reverse gap-1" aria-hidden="true">
        {Array.from({ length: max }, (_, i) => (
          <motion.span
            key={i}
            className={cn("w-full rounded-md", i < parts ? tone : "bg-muted/50")}
            initial={reduced ? undefined : { scaleY: 0.4, opacity: 0 }}
            animate={reduced ? undefined : { scaleY: 1, opacity: 1 }}
            transition={{ delay: Math.min(i, parts) * 0.03, duration: 0.18 }}
            style={{ height: `${100 / max}%` }}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
