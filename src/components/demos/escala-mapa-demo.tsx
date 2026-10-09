"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import {
  cn,
} from "@/lib/utils";
import {
  convertMapScale,
  MAP_SCALE_DENOMINATORS,
  CM_PER_KM,
  type MapScaleConversion,
} from "@/lib/demos/models";

/**
 * Simulador de ESCALA DE MAPA (PASSO 2 da auditoria).
 * Régua em centímetros sobre um mapa fictício; controles de distância no
 * mapa e de escala (1:50.000 … 1:1.000.000); conversão animada
 * cm do mapa → cm reais → km, na MESMA sequência da resolução.
 * Aceita parâmetros da questão (distanceCm, scale) para mostrar exatamente
 * os números da questão — ex.: 4,5 cm em 1:200.000 ⇒ 9 km.
 */
export interface EscalaMapaParams {
  distanceCm?: number;
  scale?: number;
}

const MIN_CM = 0.5;
const MAX_CM = 20;

function fmt(n: number, digits = 1): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

export function EscalaMapaDemo({ params }: { params?: EscalaMapaParams }) {
  const askedDistance = typeof params?.distanceCm === "number" ? params.distanceCm : 4.5;
  const askedScale =
    typeof params?.scale === "number" &&
    (MAP_SCALE_DENOMINATORS as readonly number[]).includes(params.scale)
      ? params.scale
      : 200_000;

  const [distanceCm, setDistanceCm] = useState(() =>
    Math.min(MAX_CM, Math.max(MIN_CM, askedDistance)),
  );
  const [scale, setScale] = useState<number>(askedScale);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0); // 0 mapa, 1 multiplica, 2 converte, 3 pronto
  const reduced = useReducedMotion();

  const conv: MapScaleConversion = useMemo(
    () => convertMapScale(distanceCm, scale),
    [distanceCm, scale],
  );

  // Reinicia a sequência animada quando os números mudam (padrão render-phase
  // do React: o reset síncrono acontece no render, não dentro do effect).
  const inputKey = `${distanceCm}:${scale}`;
  const [prevKey, setPrevKey] = useState(inputKey);
  if (prevKey !== inputKey) {
    setPrevKey(inputKey);
    setStep(0);
  }
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), reduced ? 0 : 350);
    const t2 = setTimeout(() => setStep(2), reduced ? 0 : 1100);
    const t3 = setTimeout(() => setStep(3), reduced ? 0 : 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [prevKey, reduced]);

  // Geometria do mapa (SVG 320×150): as cidades ficam nas pontas e a linha
  // cresce com a distância escolhida (mapeada para o espaço disponível).
  const mapLine = useMemo(() => {
    const width = 40 + ((distanceCm - MIN_CM) / (MAX_CM - MIN_CM)) * 220; // 40→260 px
    return { x1: 30, x2: 30 + width, y: 66 };
  }, [distanceCm]);

  const scaleLabel = `1:${fmtInt(scale)}`;
  const oneCmEqualsKm = scale / CM_PER_KM;

  return (
    <div className="space-y-6">
      <section aria-label="Mapa com a distância medida em centímetros">
        <h3 className="mb-1 text-sm font-medium text-muted-foreground">
          Meça a distância no mapa e converta com a escala
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Escala {scaleLabel}: cada 1 cm no mapa vale {fmtInt(scale)} cm reais ({fmt(oneCmEqualsKm, 1).replace(".", ",")} km).
        </p>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <svg
            viewBox="0 0 320 150"
            className="h-auto w-full"
            role="img"
            aria-label={`Mapa fictício: a distância entre Cidade Nova e Vila do Sul mede ${fmt(distanceCm, 1).replace(".", ",")} centímetros no papel.`}
          >
            {/* papel do mapa */}
            <rect x="8" y="8" width="304" height="134" rx="10" className="fill-muted/40" />
            <rect x="14" y="14" width="292" height="122" rx="8" className="fill-background" />
            {/* rios e estradas decorativos */}
            <path d="M20 100 C 80 70, 140 120, 300 96" fill="none" className="stroke-sky-500/30" strokeWidth="6" strokeLinecap="round" />
            <path d="M20 118 C 120 118, 220 130, 300 126" fill="none" className="stroke-muted-foreground/15" strokeWidth="3" strokeDasharray="6 5" />
            {/* cidades */}
            <g>
              <circle cx={mapLine.x1} cy={mapLine.y} r="6" className="fill-primary" />
              <text x={mapLine.x1} y={mapLine.y - 12} fontSize="10" textAnchor="middle" className="fill-foreground">
                Cidade Nova
              </text>
              <circle cx={mapLine.x2} cy={mapLine.y} r="6" className="fill-accent-2" />
              <text x={mapLine.x2} y={mapLine.y - 12} fontSize="10" textAnchor="middle" className="fill-foreground">
                Vila do Sul
              </text>
            </g>
            {/* distância medida */}
            <motion.line
              x1={mapLine.x1 + 6}
              y1={mapLine.y}
              x2={mapLine.x2 - 6}
              y2={mapLine.y}
              className="stroke-accent-1-ink"
              strokeWidth="3"
              strokeDasharray={reduced ? undefined : "7 5"}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={reduced ? { duration: 0 } : { duration: 0.8 }}
            />
            <text
              x={(mapLine.x1 + mapLine.x2) / 2}
              y={mapLine.y + 18}
              fontSize="11"
              textAnchor="middle"
              className="fill-accent-1-ink font-semibold"
            >
              {fmt(distanceCm, 1).replace(".", ",")} cm no mapa
            </text>
            {/* régua embaixo */}
            <g>
              <line x1="24" y1="128" x2="296" y2="128" className="stroke-foreground/60" strokeWidth="1.5" />
              {Array.from({ length: 12 }, (_, i) => {
                const x = 24 + (i * 272) / 11;
                return (
                  <line key={i} x1={x} y1="124" x2={x} y2="132" className="stroke-foreground/60" strokeWidth="1" />
                );
              })}
              <text x="24" y="143" fontSize="8" className="fill-muted-foreground">0</text>
              <text x="296" y="143" fontSize="8" textAnchor="end" className="fill-muted-foreground">régua (cm)</text>
            </g>
          </svg>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="escala-distancia" className="text-xs text-muted-foreground">
              Distância no mapa: <strong className="text-foreground">{fmt(distanceCm, 1).replace(".", ",")} cm</strong>
            </label>
            <Slider
              id="escala-distancia"
              value={[distanceCm]}
              onValueChange={([v]) => setDistanceCm(v)}
              min={MIN_CM}
              max={MAX_CM}
              step={0.5}
              aria-label="Distância medida no mapa, em centímetros"
            />
          </div>
          <div>
            <label htmlFor="escala-select" className="text-xs text-muted-foreground">
              Escala do mapa
            </label>
            <select
              id="escala-select"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {MAP_SCALE_DENOMINATORS.map((d) => (
                <option key={d} value={d}>
                  1:{fmtInt(d)} &nbsp;(1 cm = {fmt(d / CM_PER_KM, 1).replace(".", ",")} km)
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section aria-label="Conversão passo a passo">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Conversão na ordem da resolução
        </h3>
        <ol className="space-y-2">
          <li
            className={cn(
              "flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border p-3 text-sm transition-colors",
              step >= 1 ? "border-accent-2/40 bg-accent-2/5" : "border-border bg-muted/20 text-muted-foreground",
            )}
            aria-label="Passo 1: multiplicar pela escala"
          >
            <span className="font-semibold">Passo 1 — cm do mapa → cm reais:</span>
            <span className="font-mono tabular-nums">
              {fmt(distanceCm, 1).replace(".", ",")} × {fmtInt(scale)} = {fmtInt(conv.realCm)} cm
            </span>
          </li>
          <li
            className={cn(
              "flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-xl border p-3 text-sm transition-colors",
              step >= 2 ? "border-accent-2/40 bg-accent-2/5" : "border-border bg-muted/20 text-muted-foreground",
            )}
            aria-label="Passo 2: converter centímetros em quilômetros"
          >
            <span className="font-semibold">Passo 2 — cm → km (1 km = {fmtInt(CM_PER_KM)} cm):</span>
            <span className="font-mono tabular-nums">
              {fmtInt(conv.realCm)} ÷ {fmtInt(CM_PER_KM)} = {fmt(conv.realKm, 2).replace(".", ",")} km
            </span>
          </li>
        </ol>
        <p
          aria-live="polite"
          className={cn(
            "mt-3 rounded-xl p-3 text-center text-sm font-medium",
            step >= 3 ? "bg-success/10 text-success" : "bg-muted/40 text-muted-foreground",
          )}
        >
          {step >= 3
            ? `${fmt(distanceCm, 1).replace(".", ",")} cm no mapa, na escala ${scaleLabel}, correspondem a ${fmt(conv.realKm, 2).replace(".", ",")} km reais.`
            : "Convertendo…"}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          O erro clássico é esquecer o Passo 2 e responder em centímetros (ou dividir
          por 1.000 em vez de 100.000). A escala é uma razão: 1 : {fmtInt(scale)}.
        </p>
      </section>
    </div>
  );
}
