"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { percentOf, successiveVariations } from "@/lib/demos/models";

const TOTAL_BLOCKS = 100;

/**
 * Percentage simulator (doc section 12, v2 demo reference):
 * slider with blocks + successive increase/discount playground.
 */
export function PorcentagemDemo() {
  const [percent, setPercent] = useState(30);
  const [startValue, setStartValue] = useState(200);
  const [increase, setIncrease] = useState(20);
  const [discount, setDiscount] = useState(10);
  const reduced = useReducedMotion();

  const filled = Math.round((percent / 100) * TOTAL_BLOCKS);
  const blocksValue = percentOf(percent, 100);
  const { afterIncrease, final, netChangePct } = successiveVariations(
    startValue,
    increase,
    discount,
  );

  return (
    <div className="space-y-8">
      {/* Part 1: blocks */}
      <section aria-label="Porcentagem como blocos">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            Quantos são {percent}% de 100?
          </h3>
          <span className="text-2xl font-semibold text-accent-1-ink tabular-nums">
            {percent} blocos
          </span>
        </div>
        <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
          {percent}% de 100 = {percent}/100 × 100 = <strong className="text-foreground tabular-nums">{blocksValue.toString().replace(".", ",")}</strong> — a porcentagem pinta essa fração dos blocos.
        </p>
        <div
          className="grid grid-cols-10 gap-1 sm:grid-cols-20"
          role="img"
          aria-label={`${filled} blocos pintados de ${TOTAL_BLOCKS}, representando ${percent}%`}
        >
          {Array.from({ length: TOTAL_BLOCKS }, (_, i) => {
            const on = i < filled;
            return (
              <motion.span
                key={i}
                className={cn(
                  "aspect-square rounded-[4px]",
                  on ? "bg-brand-gradient" : "bg-muted",
                )}
                initial={reduced ? undefined : { scale: 0.5, opacity: 0 }}
                animate={reduced ? undefined : { scale: 1, opacity: 1 }}
                transition={reduced ? { duration: 0 } : { delay: on ? i * 0.006 : 0, duration: 0.18 }}
              />
            );
          })}
        </div>
        <Slider
          value={[percent]}
          onValueChange={([v]) => setPercent(v)}
          min={0}
          max={100}
          step={1}
          className="mt-4"
          aria-label="Porcentagem"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0%</span>
          <span className="tabular-nums font-medium text-foreground">{percent}%</span>
          <span>100%</span>
        </div>
      </section>

      {/* Part 2: successive variations */}
      <section aria-label="Aumento e desconto sucessivos">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">
          Aumento e depois desconto <span className="text-foreground">não se cancelam</span>
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="start-value" className="text-xs text-muted-foreground">
              Valor inicial: R$ {startValue.toLocaleString("pt-BR")}
            </label>
            <Slider
              id="start-value"
              value={[startValue]}
              onValueChange={([v]) => setStartValue(v)}
              min={50}
              max={1000}
              step={50}
              aria-label="Valor inicial em reais"
            />
            <label htmlFor="increase-pct" className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              Aumento: {increase}%
            </label>
            <Slider
              id="increase-pct"
              value={[increase]}
              onValueChange={([v]) => setIncrease(v)}
              min={0}
              max={100}
              step={5}
              aria-label="Aumento percentual"
            />
            <label htmlFor="discount-pct" className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
              Desconto depois: {discount}%
            </label>
            <Slider
              id="discount-pct"
              value={[discount]}
              onValueChange={([v]) => setDiscount(v)}
              min={0}
              max={100}
              step={5}
              aria-label="Desconto percentual após o aumento"
            />
          </div>

          <div className="flex flex-col justify-center gap-2 rounded-xl bg-muted/30 p-4 text-sm">
            <p className="flex justify-between">
              <span className="text-muted-foreground">Valor inicial</span>
              <span className="tabular-nums font-medium">
                R$ {startValue.toLocaleString("pt-BR")}
              </span>
            </p>
            <p className="flex justify-between">
              <span className="text-muted-foreground">
                após +{increase}%
              </span>
              <span className="tabular-nums font-medium">
                R$ {afterIncrease.toFixed(2).replace(".", ",")}
              </span>
            </p>
            <p className="flex justify-between border-t border-border pt-2">
              <span className="text-muted-foreground">após −{discount}%</span>
              <span className="tabular-nums text-base font-semibold">
                R$ {final.toFixed(2).replace(".", ",")}
              </span>
            </p>
            <p
              className={cn(
                "mt-1 rounded-lg px-2 py-1 text-center text-xs font-medium",
                netChangePct > 0
                  ? "bg-success/10 text-success"
                  : netChangePct < 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground",
              )}
            >
              variação líquida: {netChangePct > 0 ? "+" : ""}
              {netChangePct.toFixed(1).replace(".", ",")}%{" "}
              {Math.abs(increase - discount) < 100 &&
              netChangePct !== increase - discount
                ? `(não é ${increase - discount > 0 ? "+" : ""}${increase - discount}%!)`
                : ""}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
