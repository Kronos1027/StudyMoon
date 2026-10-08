"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedNumber } from "./animated-number";

interface GoalRingProps {
  /** Progress 0..1 */
  progress: number;
  done: number;
  target: number;
  label: string;
  sublabel?: string;
}

/** The daily goal ring (demo StudyMoon v2 reference: ring filling with gradient). */
export function GoalRing({ progress, done, target, label, sublabel }: GoalRingProps) {
  const reduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const complete = clamped >= 1;

  return (
    <div className="flex flex-col items-center gap-2" role="group" aria-label={label}>
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6d5dfc" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          <circle
            cx="60" cy="60" r={radius}
            fill="none" stroke="var(--border)" strokeWidth="10"
          />
          <motion.circle
            cx="60" cy="60" r={radius}
            fill="none"
            stroke="url(#ring-gradient)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - clamped) }}
            transition={{ duration: reduced ? 0 : 1.1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">
            <AnimatedNumber value={done} />
            <span className="text-muted-foreground">/{target}</span>
          </span>
          <span className="text-xs text-muted-foreground">
            {complete ? "Meta atingida" : label}
          </span>
        </div>
      </div>
      {sublabel ? (
        <p className="text-center text-xs text-muted-foreground">{sublabel}</p>
      ) : null}
    </div>
  );
}
