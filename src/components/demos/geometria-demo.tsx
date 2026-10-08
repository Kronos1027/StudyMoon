"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Slider } from "@/components/ui/slider";

/**
 * Geometry simulator: rectangle that scales — perimeter vs area growth,
 * plus decomposition of an L-shape (doc section 12: áreas por decomposição).
 */
export function GeometriaDemo() {
  const [width, setWidth] = useState(4);
  const [height, setHeight] = useState(3);
  const reduced = useReducedMotion();

  const area = width * height;
  const perimeter = 2 * (width + height);
  const scale = 26; // px per meter

  // L-shape decomposition: big rectangle (w×h) minus corner ((w-2)×(h-1))
  const cornerW = Math.max(1, Math.round(width / 2));
  const cornerH = Math.max(1, Math.round(height / 2));
  const lArea = area - cornerW * cornerH;

  return (
    <div className="space-y-6">
      <section aria-label="Perímetro versus área">
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">
          Aumente um lado e veja quem cresce mais rápido: perímetro ou área?
        </h3>

        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <div className="flex items-center justify-center rounded-xl bg-muted/20 p-4">
            <motion.div
              className="relative rounded-md border-2 border-primary bg-primary/15"
              style={{
                width: Math.max(30, width * scale),
                height: Math.max(30, height * scale),
              }}
              animate={reduced ? undefined : { scale: 1 }}
              role="img"
              aria-label={`Retângulo de ${width} por ${height} metros`}
            >
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground tabular-nums">
                {width} m
              </span>
              <span className="absolute -left-8 top-1/2 -translate-y-1/2 rotate-[-90deg] text-xs text-muted-foreground tabular-nums">
                {height} m
              </span>
            </motion.div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">
                Largura: <strong className="text-foreground">{width} m</strong>
              </label>
              <Slider value={[width]} onValueChange={([v]) => setWidth(v)} min={1} max={8} step={1} aria-label="Largura em metros" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Altura: <strong className="text-foreground">{height} m</strong>
              </label>
              <Slider value={[height]} onValueChange={([v]) => setHeight(v)} min={1} max={6} step={1} aria-label="Altura em metros" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Perímetro</p>
                <p className="text-xl font-semibold tabular-nums">{perimeter} m</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <p className="text-xs text-muted-foreground">Área</p>
                <p className="text-xl font-semibold text-primary tabular-nums">{area} m²</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Decomposição de figuras">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Figura em L = retângulo grande − recorte (decomposição)
        </h3>
        <div className="flex flex-wrap items-center gap-6">
          <svg width="220" height="170" role="img" aria-label="Figura em L decomposta em dois retângulos">
            <rect x="20" y="20" width="180" height="130" rx="6" fill="var(--primary)" opacity="0.18" />
            <rect
              x={20 + (180 - cornerW * 30)}
              y="20"
              width={cornerW * 30}
              height={cornerH * 30}
              rx="6"
              fill="var(--destructive)"
              opacity="0.25"
              stroke="var(--destructive)"
              strokeDasharray="4 3"
            />
            <text x="60" y="95" fontSize="12" fill="var(--muted-foreground)">
              {width}×{height} = {area} m²
            </text>
            <text
              x={20 + (180 - cornerW * 30) + 6}
              y={20 + cornerH * 30 / 2}
              fontSize="11"
              fill="var(--destructive)"
            >
              −{cornerW}×{cornerH}
            </text>
          </svg>
          <div className="rounded-xl bg-muted/30 p-4 text-sm">
            <p className="font-mono">
              Área em L = {area} − {cornerW * cornerH} = {lArea} m²
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Toda figura estranha vira soma/ subtração de figuras simples —
              essa é a técnica universal do ENEM.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
