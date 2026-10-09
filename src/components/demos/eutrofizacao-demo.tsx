"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Droplets, Fish, Pause, Play, RotateCcw, StepForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Deterministic eutrophication model (per "week" step).
// Indices are 0–100; dissolved oxygen (OD) is in mg/L.
// ---------------------------------------------------------------------------

interface LakeState {
  week: number;
  nutrientes: number;
  algas: number;
  od: number;
  peixesVivos: number;
}

const INITIAL: LakeState = { week: 0, nutrientes: 2, algas: 5, od: 8, peixesVivos: 10 };
const MAX_WEEKS = 40;
const TOTAL_FISH = 10;

function stepLake(s: LakeState, carga: number): LakeState {
  const nutrientes = Math.min(100, s.nutrientes * 0.88 + carga * 0.12);
  const algasTarget = 4 + nutrientes * 0.9;
  const algas = Math.min(100, s.algas + (algasTarget - s.algas) * 0.3);
  const od = Math.min(8, Math.max(0.4, 8 - algas * 0.07 - carga * 0.02));
  const deaths =
    od < 4 ? Math.min(s.peixesVivos, Math.max(1, Math.round((4 - od) * 2))) : 0;
  return {
    week: s.week + 1,
    nutrientes,
    algas,
    od,
    peixesVivos: Math.max(0, s.peixesVivos - deaths),
  };
}

// ---------------------------------------------------------------------------
// Deterministic positions (seeded, so SSR/CSR never mismatch).
// ---------------------------------------------------------------------------

const ALGAE_SPOTS = Array.from({ length: 36 }, (_, i) => ({
  left: 4 + ((i * 37) % 92),
  size: 4 + ((i * 13) % 4),
}));
const FISH_SPOTS = Array.from({ length: TOTAL_FISH }, (_, i) => ({
  left: 16 + ((i * 23) % 66),
  top: 34 + ((i * 17) % 40),
  duration: 2.2 + (i % 4) * 0.5,
}));
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  delay: (i * 0.33) % 2.1,
  drift: 18 + ((i * 29) % 30),
  sink: 8 + ((i * 11) % 16),
}));

/**
 * Eutrophication / aquatic ecology simulator (doc section 12):
 * sewage-load slider → nutrients entering the lake → algae bloom →
 * dissolved oxygen sag (chart) → fish mortality. Bound ONLY to the topic
 * cn-ecologia (registry.ts).
 */
export function EutrofizacaoDemo() {
  const [carga, setCarga] = useState(60);
  const [history, setHistory] = useState<LakeState[]>([INITIAL]);
  const [running, setRunning] = useState(false);
  const reduced = useReducedMotion();

  const current = history[history.length - 1];

  const advance = () =>
    setHistory((h) => {
      if (h.length >= MAX_WEEKS + 1) return h;
      return [...h, stepLake(h[h.length - 1], carga)];
    });

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setHistory((h) => {
        if (h.length >= MAX_WEEKS + 1) {
          setRunning(false);
          return h;
        }
        return [...h, stepLake(h[h.length - 1], carga)];
      });
    }, 700);
    return () => clearInterval(id);
  }, [running, carga]);

  function reset() {
    setRunning(false);
    setHistory([INITIAL]);
  }

  // Derived visuals.
  const algaeCount = Math.round((current.algas / 100) * ALGAE_SPOTS.length);
  const particleCount = carga === 0 ? 0 : Math.max(1, Math.ceil(carga / 13));
  const deadFish = TOTAL_FISH - current.peixesVivos;
  const odTone =
    current.od >= 5 ? "text-success" : current.od >= 3 ? "text-amber-500" : "text-destructive";
  const lineTone =
    current.od >= 5 ? "#10b981" : current.od >= 3 ? "#f59e0b" : "#ef4444";

  const status = useMemo(() => {
    if (current.peixesVivos === 0)
      return {
        tone: "bg-destructive/10 text-destructive",
        text: "Mortandade total: sem oxigênio dissolvido, o lago colapsou — eutrofização completa.",
      };
    if (current.od < 4)
      return {
        tone: "bg-destructive/10 text-destructive",
        text: `Zona crítica: as bactérias que decompõem as algas consomem o oxigênio — ${deadFish} de ${TOTAL_FISH} peixes morreram.`,
      };
    if (current.algas >= 30)
      return {
        tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        text: "Floração de algas em curso: o oxigênio dissolvido já começou a cair.",
      };
    return {
      tone: "bg-success/10 text-success",
      text: "Lago equilibrado: poucas algas e oxigênio dissolvido alto.",
    };
  }, [current, deadFish]);

  // Chart geometry (SVG viewBox 320×130; OD 0–8 mg/L).
  const chart = useMemo(() => {
    const w = 320;
    const xMax = Math.max(12, history.length - 1);
    const toX = (week: number) => 8 + (week / xMax) * (w - 20);
    const toY = (od: number) => 118 - (od / 8) * 106;
    const points = history.map((s) => `${toX(s.week)},${toY(s.od)}`).join(" ");
    return { w, toX, toY, points, xMax };
  }, [history]);

  return (
    <div className="space-y-6">
      {/* 1. Sewage-load control */}
      <section aria-label="Controle da carga de esgoto">
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Droplets className="h-4 w-4" aria-hidden="true" />
            Carga de esgoto despejada no lago
          </h3>
          <span className="text-2xl font-semibold tabular-nums">{carga}%</span>
        </div>
        <Slider
          value={[carga]}
          onValueChange={([v]) => setCarga(v)}
          min={0}
          max={100}
          step={5}
          aria-label="Carga de esgoto no lago, de 0 a 100 por cento"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>lago preservado</span>
          <span>esgoto bruto</span>
        </div>
      </section>

      {/* 2. The lake */}
      <section aria-label="Simulação do lago" className="space-y-3">
        <div
          role="img"
          aria-label={`Semana ${current.week}: ${current.peixesVivos} de ${TOTAL_FISH} peixes vivos, índice de algas ${Math.round(current.algas)}, oxigênio dissolvido ${current.od.toFixed(1)} mg por litro.`}
          className="relative h-64 overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-sky-100 to-sky-300 dark:from-sky-950 dark:to-sky-900"
        >
          {/* Sun glimmer */}
          <div className="absolute right-4 top-3 h-6 w-6 rounded-full bg-amber-300/60 dark:bg-amber-400/30" aria-hidden="true" />

          {/* Sewage pipe */}
          {carga > 0 ? (
            <div className="absolute left-0 top-[38%] flex items-center" aria-hidden="true">
              <div className="h-9 w-6 rounded-r-md border border-border bg-muted-foreground/40" />
              <span className="ml-1 rounded bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                esgoto
              </span>
            </div>
          ) : null}

          {/* Nutrient particles flowing in */}
          {PARTICLES.slice(0, particleCount).map((p, i) => (
            <motion.span
              key={i}
              className="absolute left-4 top-[44%] h-1.5 w-1.5 rounded-full bg-amber-500/80"
              aria-hidden="true"
              initial={false}
              animate={
                reduced
                  ? { x: p.drift, y: p.sink, opacity: 0.7 }
                  : { x: [0, p.drift], y: [0, p.sink], opacity: [0.9, 0.6] }
              }
              transition={
                reduced
                  ? { duration: 0 }
                  : { duration: 2.2, repeat: Infinity, delay: p.delay, ease: "easeOut" }
              }
            />
          ))}

          {/* Algae film on the surface */}
          <div
            className="absolute inset-x-0 top-0 h-[16%] bg-emerald-500/20"
            aria-hidden="true"
            style={{ opacity: Math.min(1, current.algas / 45) }}
          />
          {ALGAE_SPOTS.slice(0, algaeCount).map((spot, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-emerald-600/70"
              aria-hidden="true"
              style={{ left: `${spot.left}%`, top: `${2 + (i % 3) * 3}%`, width: spot.size, height: spot.size }}
              initial={reduced ? undefined : { scale: 0.4, opacity: 0 }}
              animate={reduced ? undefined : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          ))}

          {/* Living fish */}
          {FISH_SPOTS.slice(0, current.peixesVivos).map((spot, i) => (
            <motion.span
              key={i}
              className={cn(
                "absolute text-sky-700 dark:text-sky-300",
                current.od < 4 && "animate-pulse",
              )}
              aria-hidden="true"
              style={{ left: `${spot.left}%`, top: `${spot.top}%` }}
              animate={reduced ? undefined : { x: [0, 6, 0] }}
              transition={{ duration: spot.duration, repeat: Infinity, ease: "easeInOut" }}
            >
              <Fish className="h-5 w-5 -scale-x-100" />
            </motion.span>
          ))}

          {/* Dead fish floating belly-up */}
          {Array.from({ length: deadFish }, (_, i) => (
            <motion.span
              key={i}
              className="absolute text-muted-foreground/50"
              aria-hidden="true"
              style={{ left: `${72 + (i % 5) * 5}%`, top: `${10 + Math.floor(i / 5) * 5}%` }}
              initial={reduced ? undefined : { y: 14, opacity: 0 }}
              animate={reduced ? undefined : { y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Fish className="h-5 w-5 rotate-180" />
            </motion.span>
          ))}

          {/* Week badge */}
          <span className="absolute bottom-2 right-3 rounded-full bg-background/70 px-2 py-0.5 text-xs font-medium text-foreground tabular-nums">
            semana {current.week}
          </span>
        </div>

        {/* Live readings */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-muted/50 p-2.5">
            <p className="text-[11px] text-muted-foreground">Nutrientes (P/N)</p>
            <p className="text-lg font-semibold tabular-nums">{Math.round(current.nutrientes)}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5">
            <p className="text-[11px] text-muted-foreground">Algas</p>
            <p className="text-lg font-semibold tabular-nums">{Math.round(current.algas)}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-2.5">
            <p className="text-[11px] text-muted-foreground">Oxigênio dissolvido</p>
            <p className={cn("text-lg font-semibold tabular-nums", odTone)}>
              {current.od.toFixed(1)} mg/L
            </p>
          </div>
        </div>

        <p
          aria-live="polite"
          className={cn("rounded-xl p-3 text-sm font-medium", status.tone)}
        >
          {status.text}
        </p>
      </section>

      {/* 3. Dissolved oxygen chart */}
      <section aria-label="Gráfico do oxigênio dissolvido por semana">
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">
          Oxigênio dissolvido (mg/L) ao longo das semanas
        </h3>
        <div className="rounded-xl border border-border bg-card p-2">
          <svg viewBox="0 0 320 130" className="h-40 w-full" role="img"
            aria-label={`Oxigênio dissolvido: começou em 8 mg/L e está em ${current.od.toFixed(1)} mg/L na semana ${current.week}.`}>
            {[2, 4, 6, 8].map((v) => (
              <line key={v} x1={8} x2={312} y1={118 - (v / 8) * 106} y2={118 - (v / 8) * 106}
                className="stroke-border" strokeWidth={1} />
            ))}
            {/* critical threshold at 3 mg/L */}
            <line x1={8} x2={312} y1={118 - (3 / 8) * 106} y2={118 - (3 / 8) * 106}
              className="stroke-destructive/60" strokeWidth={1.5} strokeDasharray="5 4" />
            <text x={10} y={118 - (3 / 8) * 106 - 4} className="fill-destructive/80 text-[9px]" >
              crítico: 3 mg/L
            </text>
            <text x={300} y={128} className="fill-muted-foreground text-[9px]">semanas</text>
            {history.map((s) => (
              <circle key={s.week} cx={chart.toX(s.week)} cy={chart.toY(s.od)} r={2}
                fill={lineTone} />
            ))}
            <polyline points={chart.points} fill="none" stroke={lineTone} strokeWidth={2.5}
              strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </div>
      </section>

      {/* 4. Controls */}
      <section aria-label="Controles da simulação" className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setRunning((r) => !r)} disabled={current.week >= MAX_WEEKS}>
          {running ? (
            <>
              <Pause className="h-4 w-4" aria-hidden="true" /> Pausar
            </>
          ) : (
            <>
              <Play className="h-4 w-4" aria-hidden="true" /> Simular
            </>
          )}
        </Button>
        <Button size="sm" variant="outline" onClick={advance} disabled={current.week >= MAX_WEEKS}>
          <StepForward className="h-4 w-4" aria-hidden="true" /> 1 semana
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reiniciar
        </Button>
      </section>

      <p className="text-xs leading-relaxed text-muted-foreground">
        A cadeia da <strong className="text-foreground">eutrofização</strong>: o esgoto carrega
        fosfato e nitrato (nutrientes) para a água → as algas se multiplicam na superfície
        (floração) → quando morrem, bactérias aeróbias as decompõem e consomem o oxigênio
        dissolvido → peixes e outros organismos aquáticos morrem por asfixia. Diminua a carga
        no meio da simulação e observe o lago se recuperar — quando o lançamento de esgoto cessa,
        o oxigênio volta aos poucos. É um clássico do ENEM em ecologia e química ambiental.
      </p>
    </div>
  );
}
