"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";
import {
  BRAZIL_REGIONS,
  BRAZIL_TOTAL_MILLIONS,
  regionShares,
} from "@/lib/demos/models";

/**
 * Geography data explorer: Brazil regions population (Censo 2022, IBGE —
 * primeiros resultados definitivos) with a live chart. Dados e participações
 * percentuais vêm de src/lib/demos/models.ts (regionShares — testado:
 * shares somam ~99,5% do total do país). Vinculada só a
 * ch-geo-humana.populacao (nunca a geo-física/cartografia/meio-ambiente).
 */
const REGION_COLORS: Record<string, string> = {
  N: "#22d3ee",
  NE: "#6d5dfc",
  SE: "#f472b6",
  S: "#34d399",
  CO: "#fbbf24",
};

const SHARES = regionShares(
  BRAZIL_REGIONS.map((r) => r.population),
  BRAZIL_TOTAL_MILLIONS,
);

export function MapasDemo() {
  const [indicator, setIndicator] = useState<"population" | "share">("population");
  const [selected, setSelected] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const data = BRAZIL_REGIONS.map((r, i) => ({
    name: r.name,
    value: indicator === "population" ? r.population : SHARES[i],
  }));

  const activeIndex = BRAZIL_REGIONS.findIndex((r) => r.id === selected);
  const activeRegion = activeIndex >= 0 ? BRAZIL_REGIONS[activeIndex] : null;
  const activeShare = activeIndex >= 0 ? SHARES[activeIndex] : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Regiões do Brasil por população (Censo 2022, IBGE)
        </h3>
        <div role="tablist" aria-label="Indicador" className="flex rounded-lg border border-border p-1">
          {(
            [
              ["population", "População (milhões)"],
              ["share", "% da população"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={indicator === key}
              onClick={() => setIndicator(key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                indicator === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_200px]">
        <div className="h-48" role="img" aria-label="Gráfico de barras da população por região">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip
                formatter={(value: number) => [
                  `${value.toLocaleString("pt-BR")} ${indicator === "population" ? "milhões" : "%"}`,
                  indicator === "population" ? "População" : "Participação",
                ]}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {BRAZIL_REGIONS.map((r) => (
                  <Cell key={r.id} fill={REGION_COLORS[r.id]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-1.5">
          {BRAZIL_REGIONS.map((r, i) => (
            <motion.button
              key={r.id}
              onClick={() => setSelected(selected === r.id ? null : r.id)}
              initial={reduced ? undefined : { opacity: 0, x: 8 }}
              animate={reduced ? undefined : { opacity: 1, x: 0 }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                selected === r.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
              )}
              aria-pressed={selected === r.id}
            >
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ background: REGION_COLORS[r.id] }} aria-hidden="true" />
                {r.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {indicator === "share" ? `${SHARES[i].toString().replace(".", ",")}%` : `${r.population.toString().replace(".", ",")} mi`}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground" aria-live="polite">
        {activeRegion && activeShare !== null
          ? `A região ${activeRegion.name} tem ${activeRegion.population.toString().replace(".", ",")} milhões de habitantes — ${activeShare.toString().replace(".", ",")}% dos ${BRAZIL_TOTAL_MILLIONS.toString().replace(".", ",")} milhões do país (Censo 2022). Pergunta de prova: por que o Sudeste concentra tanta gente? Industrialização histórica, emprego e serviços.`
          : `Dados abertos do IBGE (Censo 2022 — primeiros resultados definitivos; população do país: ${BRAZIL_TOTAL_MILLIONS.toString().replace(".", ",")} milhões). Toque em uma região para destacar.`}
      </p>
    </div>
  );
}
