"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

/**
 * Geography data explorer: Brazil regions with a choropleth-style list and
 * live chart (IBGE-style open data, simplified for study purposes).
 */
const REGIONS = [
  { id: "N", name: "Norte", population: 17.9, share: 8.5, color: "#22d3ee" },
  { id: "NE", name: "Nordeste", population: 57.1, share: 27.1, color: "#6d5dfc" },
  { id: "SE", name: "Sudeste", population: 89.6, share: 42.5, color: "#f472b6" },
  { id: "S", name: "Sul", population: 30.4, share: 14.4, color: "#34d399" },
  { id: "CO", name: "Centro-Oeste", population: 16.6, share: 7.9, color: "#fbbf24" },
];

const INDICATORS = [
  { key: "population", label: "População (milhões)", unit: "mi" },
  { key: "share", label: "% da população do Brasil", unit: "%" },
] as const;

export function MapasDemo() {
  const [indicator, setIndicator] = useState<"population" | "share">("population");
  const [selected, setSelected] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const data = REGIONS.map((r) => ({
    name: r.name,
    value: r[indicator],
  }));

  const activeRegion = REGIONS.find((r) => r.id === selected);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Regiões do Brasil por população (Censo 2022, IBGE)
        </h3>
        <div role="tablist" aria-label="Indicador" className="flex rounded-lg border border-border p-1">
          {INDICATORS.map((ind) => (
            <button
              key={ind.key}
              role="tab"
              aria-selected={indicator === ind.key}
              onClick={() => setIndicator(ind.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors",
                indicator === ind.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {ind.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_200px]">
        <div className="h-48" role="img" aria-label="Gráfico de barras por região">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip
                formatter={(value: number) => [`${value} ${indicator === "population" ? "mi" : "%"}`, "População"]}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {REGIONS.map((r) => (
                  <Cell key={r.id} fill={r.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-1.5">
          {REGIONS.map((r) => (
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
                <span className="h-3 w-3 rounded-sm" style={{ background: r.color }} aria-hidden="true" />
                {r.name}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {r[indicator]}{indicator === "share" ? "%" : " mi"}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {activeRegion
          ? `A região ${activeRegion.name} concentra ${activeRegion.share}% da população brasileira — ${activeRegion.population} milhões de habitantes. Pergunta de prova: por que o Sudeste concentra tanta gente? (industrialização histórica + emprego + serviços)`
          : "Dados abertos do IBGE (Censo 2022). Toque em uma região para destacar."}
      </p>
    </div>
  );
}
