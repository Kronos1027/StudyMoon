"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  durationMs?: number;
  className?: string;
  format?: (value: number) => string;
}

/**
 * Numbers that count up to the value (doc section 11: "números contam até
 * o valor"). Respects prefers-reduced-motion (jumps straight to the value).
 */
export function AnimatedNumber({
  value,
  durationMs = 900,
  className,
  format,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || durationMs <= 0) {
      // Deferred via rAF: avoids a synchronous setState inside the effect.
      const raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(value * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, durationMs]);

  return (
    <span className={className}>
      {format ? format(display) : display.toLocaleString("pt-BR")}
    </span>
  );
}
