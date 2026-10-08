"use client";

import { motion, useReducedMotion } from "framer-motion";

interface ConsistencyMapProps {
  /** 12 weeks × 7 days grid of study intensity (0..4). Row 0 = oldest week. */
  weeks: number[][];
}

const LEVEL_CLASSES = [
  "bg-card border border-border",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-brand-gradient",
] as const;

/**
 * 12-week consistency map (GitHub-style heatmap). Appears in a wave:
 * each cell fades in with a small delay by column (doc section 11).
 */
export function ConsistencyMap({ weeks }: ConsistencyMapProps) {
  const reduced = useReducedMotion();

  return (
    <div
      className="flex gap-1.5 overflow-x-auto scroll-moon pb-1"
      role="img"
      aria-label="Mapa de constância das últimas 12 semanas: verde mais forte significa mais dias estudados"
    >
      <div className="flex flex-col justify-between py-0.5 pr-1 text-[9px] text-muted-foreground">
        {["S", "", "T", "", "Q", "", "S"].map((d, i) => (
          <span key={i} className="h-3.5 leading-3.5">{d}</span>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-1.5">
          {week.map((level, dayIndex) => (
            <motion.span
              key={dayIndex}
              className={LEVEL_CLASSES[Math.max(0, Math.min(4, level))]}
              style={{ width: 14, height: 14, borderRadius: 4 }}
              initial={reduced ? undefined : { opacity: 0, scale: 0.6 }}
              animate={reduced ? undefined : { opacity: 1, scale: 1 }}
              transition={{
                delay: reduced ? 0 : (weeks.length - weekIndex) * 0.03 + dayIndex * 0.012,
                duration: 0.25,
              }}
            >
              <span className="sr-only">
                {level > 0 ? `estudou (nível ${level})` : "sem estudo"}
              </span>
            </motion.span>
          ))}
        </div>
      ))}
    </div>
  );
}
