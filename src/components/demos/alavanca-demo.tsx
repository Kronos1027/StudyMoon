"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { leverState } from "@/lib/demos/models";

/**
 * Simulador de ALAVANCA — torque e equilíbrio (PASSO 2 + PASSO 3).
 * FÍSICA: vinculado apenas a cn-mecanica.alavanca (nunca a matemática).
 * Coerência visual garantida: a barra fica HORIZONTAL quando os torques
 * são iguais (3 kg × 4 m = 6 kg × 2 m ⇒ 0°) e inclina para o lado do MAIOR
 * torque, com ângulo proporcional à diferença relativa (modelo testado).
 * Os pratos deslizam pela barra conforme a distância ao apoio.
 */
const MAX_DISTANCE = 6;
const BAR_WIDTH = 300; // px
const distToPx = (d: number) => 24 + (d / MAX_DISTANCE) * (BAR_WIDTH / 2 - 34); // 24..~116 px do centro

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export function AlavancaDemo() {
  const [leftMass, setLeftMass] = useState(3);
  const [leftDistance, setLeftDistance] = useState(4);
  const [rightMass, setRightMass] = useState(6);
  const [rightDistance, setRightDistance] = useState(2);
  const reduced = useReducedMotion();

  const state = leverState(leftMass, leftDistance, rightMass, rightDistance);
  // A barra gira em torno do apoio; o lado de MAIOR torque desce.
  const barRotation = state.balanced
    ? 0
    : state.heavierSide === "left"
      ? -state.tiltDeg
      : state.tiltDeg;

  return (
    <div className="space-y-6">
      <section aria-label="Alavanca de dois pratos">
        <h3 className="mb-1 text-sm font-medium text-muted-foreground">
          A alavanca equilibra quando os torques (peso × distância) são iguais
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Esquerda: {leftMass} kg × {fmt(leftDistance)} m ={" "}
          <strong>{fmt(state.leftTorque)} kg·m</strong> · Direita: {rightMass} kg ×{" "}
          {fmt(rightDistance)} m = <strong>{fmt(state.rightTorque)} kg·m</strong>
        </p>

        <div
          className="relative mx-auto h-72 max-w-md"
          role="img"
          aria-label={
            state.balanced
              ? `Alavanca equilibrada: torque de ${fmt(state.leftTorque)} quilograma por metro em cada lado; barra horizontal.`
              : `Alavanca desequilibrada: torque esquerdo ${fmt(state.leftTorque)} contra direito ${fmt(state.rightTorque)} quilograma por metro; a barra inclina ${state.tiltDeg.toFixed(1).replace(".", ",")} graus para o lado ${state.heavierSide === "left" ? "esquerdo" : "direito"}.`
          }
        >
          {/* apoio (fulcro) */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2" aria-hidden="true">
            <div className="mx-auto h-16 w-2 rounded-t-sm bg-border" />
            <div className="mx-auto h-2.5 w-12 rounded-sm bg-muted-foreground/50" />
          </div>

          {/* barra que gira em torno do centro (apoio) */}
          <motion.div
            className="absolute left-1/2 top-10 h-2.5 rounded-full bg-border"
            style={{ width: BAR_WIDTH, x: "-50%", transformOrigin: "center center" }}
            animate={{ rotate: barRotation }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 14 }}
          >
            {/* marcas de distância (1 m a 6 m de cada lado) */}
            {Array.from({ length: MAX_DISTANCE }, (_, i) => i + 1).map((m) => (
              <span
                key={`t-${m}`}
                className="absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded bg-muted-foreground/40"
                style={{ left: `calc(50% + ${distToPx(m)}px)` }}
                aria-hidden="true"
              />
            ))}
            {Array.from({ length: MAX_DISTANCE }, (_, i) => i + 1).map((m) => (
              <span
                key={`t2-${m}`}
                className="absolute top-1/2 h-2 w-0.5 -translate-y-1/2 rounded bg-muted-foreground/40"
                style={{ left: `calc(50% - ${distToPx(m)}px)` }}
                aria-hidden="true"
              />
            ))}

            <Pan side="left" mass={leftMass} distance={leftDistance} rotation={barRotation} />
            <Pan side="right" mass={rightMass} distance={rightDistance} rotation={barRotation} />
          </motion.div>
        </div>

        <p
          aria-live="polite"
          className={cn(
            "mt-3 rounded-lg p-2.5 text-center text-sm font-medium",
            state.balanced ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
          )}
        >
          {state.balanced
            ? `Equilíbrio! Torques iguais (${fmt(state.leftTorque)} kg·m de cada lado) — a barra fica horizontal.`
            : `Desequilíbrio: o torque ${state.heavierSide === "left" ? "esquerdo" : "direito"} é maior, e a barra pende para esse lado (${state.tiltDeg.toFixed(1).replace(".", ",")}°).`}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="alavanca-massa-e" className="text-xs text-muted-foreground">
              Peso esquerdo: <strong className="text-foreground">{leftMass} kg</strong>
            </label>
            <Slider
              id="alavanca-massa-e"
              value={[leftMass]}
              onValueChange={([v]) => setLeftMass(v)}
              min={1}
              max={12}
              step={1}
              aria-label="Peso do lado esquerdo, em quilogramas"
            />
            <label htmlFor="alavanca-dist-e" className="mt-3 block text-xs text-muted-foreground">
              Distância esquerda: <strong className="text-foreground">{fmt(leftDistance)} m</strong>
            </label>
            <Slider
              id="alavanca-dist-e"
              value={[leftDistance]}
              onValueChange={([v]) => setLeftDistance(v)}
              min={0.5}
              max={MAX_DISTANCE}
              step={0.5}
              aria-label="Distância do peso esquerdo ao apoio, em metros"
            />
          </div>
          <div>
            <label htmlFor="alavanca-massa-d" className="text-xs text-muted-foreground">
              Peso direito: <strong className="text-foreground">{rightMass} kg</strong>
            </label>
            <Slider
              id="alavanca-massa-d"
              value={[rightMass]}
              onValueChange={([v]) => setRightMass(v)}
              min={1}
              max={12}
              step={1}
              aria-label="Peso do lado direito, em quilogramas"
            />
            <label htmlFor="alavanca-dist-d" className="mt-3 block text-xs text-muted-foreground">
              Distância direita: <strong className="text-foreground">{fmt(rightDistance)} m</strong>
            </label>
            <Slider
              id="alavanca-dist-d"
              value={[rightDistance]}
              onValueChange={([v]) => setRightDistance(v)}
              min={0.5}
              max={MAX_DISTANCE}
              step={0.5}
              aria-label="Distância do peso direito ao apoio, em metros"
            />
          </div>
        </div>
      </section>

      <section
        aria-label="Conceito de torque"
        className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed"
      >
        <p>
          <strong>Torque (momento da força)</strong> = peso × braço (distância ao
          apoio), medido em kg·m. Um peso menor, mais longe do apoio, equilibra um
          peso maior, mais perto — é o princípio da alavanca descrito por
          Arquimedes. Dica: tente <span className="font-mono">3 kg × 4 m</span>{" "}
          contra <span className="font-mono">6 kg × 2 m</span> — torques iguais
          (12 kg·m), barra na horizontal.
        </p>
      </section>
    </div>
  );
}

function Pan({
  side,
  mass,
  distance,
  rotation,
}: {
  side: "left" | "right";
  mass: number;
  distance: number;
  rotation: number;
}) {
  const px = distToPx(distance);
  const left = side === "left" ? `calc(50% - ${px}px)` : `calc(50% + ${px}px)`;
  return (
    <div
      className="absolute top-1/2 flex flex-col items-center"
      style={{
        left,
        transform: `translate(-50%, 0) rotate(${-rotation}deg)`,
        transformOrigin: "top center",
      }}
    >
      {/* fio */}
      <span className="h-16 w-0.5 bg-muted-foreground/50" aria-hidden="true" />
      {/* prato com o peso */}
      <span
        className={cn(
          "flex h-11 w-14 items-center justify-center rounded-b-xl border-2 text-sm font-bold tabular-nums",
          side === "left"
            ? "border-primary/60 bg-primary/10 text-primary"
            : "border-accent-2/60 bg-accent-2/10 text-[#052e3c] dark:text-foreground",
        )}
      >
        {mass} kg
      </span>
      <span className="mt-1 rounded bg-background/80 px-1 text-[10px] text-muted-foreground tabular-nums">
        {fmt(distance)} m
      </span>
    </div>
  );
}
