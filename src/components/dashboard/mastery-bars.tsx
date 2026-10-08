"use client";

import { motion, useReducedMotion } from "framer-motion";

interface MasteryBar {
  area: string;
  /** Mastery percent 0..100 (from Elo mapping). */
  percent: number;
}

/** Animated bars of mastery per area (doc section 6.5: domínio por área). */
export function MasteryBars({ bars }: { bars: MasteryBar[] }) {
  const reduced = useReducedMotion();

  return (
    <ul className="space-y-3" aria-label="Domínio por área">
      {bars.map((bar, i) => (
        <li key={bar.area} className="space-y-1">
          <div className="flex items-baseline justify-between text-sm">
            <span>{bar.area}</span>
            <span className="tabular-nums text-muted-foreground">
              {Math.round(bar.percent)}%
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(bar.percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Domínio em ${bar.area}`}
          >
            <motion.div
              className="h-full rounded-full bg-brand-gradient"
              initial={reduced ? { width: `${bar.percent}%` } : { width: 0 }}
              animate={{ width: `${Math.max(2, bar.percent)}%` }}
              transition={{ duration: reduced ? 0 : 0.9, delay: reduced ? 0 : i * 0.12, ease: "easeOut" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
