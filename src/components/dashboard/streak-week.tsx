"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

interface StreakWeekProps {
  /** 7 entries, index 0 = Sunday of the current week. null = no data (future). */
  days: Array<{ studied: boolean; isToday: boolean } | null>;
  current: number;
}

/** Streak card with the week view and pulsing flame (doc section 11). */
export function StreakWeek({ days, current }: StreakWeekProps) {
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col items-center gap-3" aria-label={`Sequência de ${current} dias`}>
      <div className="relative">
        <Flame
          className={cn(
            "h-10 w-10",
            current > 0 ? "text-accent-2-ink" : "text-muted-foreground/40",
          )}
          aria-hidden="true"
        />
        {current > 0 && !reduced ? (
          <motion.span
            className="absolute inset-0 -z-10 rounded-full bg-accent-2/25 blur-lg"
            animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
        ) : null}
        {current > 0 ? (
          <span className="absolute -right-3 -top-1 rounded-full bg-accent-2 px-1.5 py-0.5 text-xs font-bold text-[#052e3c]">
            {current}
          </span>
        ) : null}
      </div>

      <div className="flex gap-1.5" role="img" aria-label="Dias estudados nesta semana">
        {days.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">{WEEKDAYS[i]}</span>
            <span
              className={cn(
                "h-7 w-7 rounded-lg border transition-colors",
                day?.studied
                  ? "border-transparent bg-brand-gradient"
                  : "border-border bg-card",
                day?.isToday && "ring-2 ring-ring ring-offset-1 ring-offset-background",
              )}
              aria-hidden="true"
            />
            <span className="sr-only">
              {day ? (day.studied ? "estudou" : "não estudou") : "dia futuro"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
