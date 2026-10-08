"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

/**
 * Ratio/ proportion simulator: a balance that tilts until the proportion
 * holds, plus the rule-of-three table (doc section 12).
 */
export function RazaoProporcaoDemo() {
  const [leftWeight, setLeftWeight] = useState(3);
  const [leftDistance, setLeftDistance] = useState(4);
  const [rightWeight, setRightWeight] = useState(6);

  const leftTorque = leftWeight * leftDistance;
  const rightDistance = leftTorque / Math.max(0.5, rightWeight);
  const balanced = Math.abs(leftDistance - rightDistance) < 0.01;

  // Rule of three: 3 kg -> R$ 21 | x kg -> R$ ? (direct)
  const riceKg = 5;
  const ricePrice = (21 / 3) * riceKg;
  const reduced = useReducedMotion();

  const tilt = balanced ? 0 : Math.max(-8, Math.min(8, (leftDistance - rightDistance)));

  return (
    <div className="space-y-8">
      {/* Balance */}
      <section aria-label="Proporção como balança equilibrada">
        <h3 className="mb-1 text-sm font-medium text-muted-foreground">
          A balança equilibra quando peso × distância é igual dos dois lados
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          {leftWeight} kg × {format(leftDistance)} m = {format(leftTorque)} · {" "}
          {rightWeight} kg × {format(rightDistance)} m = {format(leftWeight * rightDistance)}
        </p>

        <div className="flex items-end justify-center gap-0 pb-2" role="img" aria-label="Balança de dois pratos">
          <div className="flex flex-col items-center gap-1">
            <motion.span
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"
              animate={{ y: tilt }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 12 }}
            >
              {leftWeight} kg
            </motion.span>
            <span className="text-xs text-muted-foreground">{format(leftDistance)} m</span>
          </div>

          <motion.div
            className="relative mx-2 h-1.5 w-52 rounded-full bg-border sm:w-72"
            animate={{ rotate: -tilt }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 12 }}
          >
            <span className="absolute -bottom-8 left-1/2 h-8 w-1.5 -translate-x-1/2 rounded bg-border" />
          </motion.div>

          <div className="flex flex-col items-center gap-1">
            <motion.span
              className="rounded-md bg-accent-2 px-3 py-1.5 text-sm font-bold text-[#052e3c]"
              animate={{ y: -tilt }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 12 }}
            >
              {rightWeight} kg
            </motion.span>
            <span className="text-xs text-muted-foreground">{format(rightDistance)} m</span>
          </div>
        </div>

        <p
          className={cn(
            "mt-3 rounded-lg p-2.5 text-center text-sm font-medium",
            balanced ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {balanced
            ? "Equilibrada! A distância do lado direito se ajusta sozinha pela proporção."
            : `Para equilibrar com ${rightWeight} kg, a distância certa é ${format(rightDistance)} m.`}
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">
              Peso esquerdo: <strong className="text-foreground">{leftWeight} kg</strong>
            </label>
            <Slider value={[leftWeight]} onValueChange={([v]) => setLeftWeight(v)} min={1} max={12} step={1} aria-label="Peso do lado esquerdo" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Distância esquerda: <strong className="text-foreground">{format(leftDistance)} m</strong>
            </label>
            <Slider value={[leftDistance]} onValueChange={([v]) => setLeftDistance(v)} min={0.5} max={8} step={0.5} aria-label="Distância do lado esquerdo" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Peso direito: <strong className="text-foreground">{rightWeight} kg</strong>
            </label>
            <Slider value={[rightWeight]} onValueChange={([v]) => setRightWeight(Math.max(1, v))} min={1} max={12} step={1} aria-label="Peso do lado direito" />
          </div>
        </div>
      </section>

      {/* Rule of three table */}
      <section aria-label="Regra de três">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Regra de três direta (mais kg, mais reais)
        </h3>
        <div className="mx-auto max-w-sm overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-4 py-2 text-left font-medium">Arroz (kg)</th>
                <th className="px-4 py-2 text-left font-medium">Preço (R$)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-4 py-2 tabular-nums">3</td>
                <td className="px-4 py-2 tabular-nums">21,00</td>
              </tr>
              <tr className="border-t border-border bg-primary/5">
                <td className="px-4 py-2 font-semibold tabular-nums">{riceKg}</td>
                <td className="px-4 py-2 font-semibold tabular-nums text-accent-1-ink">
                  {format(ricePrice).replace(".", ",")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          A proporção se mantém: o preço por quilo é sempre 21 ÷ 3 = R$ 7.
        </p>
      </section>
    </div>
  );
}

function format(n: number): string {
  return (Math.round(n * 10) / 10).toString().replace(".", ",");
}
