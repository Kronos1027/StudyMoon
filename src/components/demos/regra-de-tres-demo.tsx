"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { ruleOfThree } from "@/lib/demos/models";

/**
 * Simulador de REGRA DE TRÊS (PASSO 2 — dividido da antiga "razao-proporcao").
 * Tabela clássica com grandezas e valores calculados pelo código a partir
 * dos controles (nunca texto fixo). Modos directo e inverso.
 */
type Kind = "directa" | "inversa";

interface Grandeza {
  name: string;
  unit: string;
}

const DIRECT: [Grandeza, Grandeza] = [
  { name: "Arroz (kg)", unit: "kg" },
  { name: "Preço (R$)", unit: "R$" },
];
const INVERSE: [Grandeza, Grandeza] = [
  { name: "Operários", unit: "op." },
  { name: "Dias de obra", unit: "dias" },
];

function fmt(n: number): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function RegraDeTresDemo() {
  const [kind, setKind] = useState<Kind>("directa");
  const [a, setA] = useState(3);
  const [b, setB] = useState(21);
  const [c, setC] = useState(5);
  const reduced = useReducedMotion();

  const labels = kind === "directa" ? DIRECT : INVERSE;
  const x = ruleOfThree(a, b, c, kind);

  return (
    <div className="space-y-6">
      <section aria-label="Regra de três interativa">
        <div
          role="tablist"
          aria-label="Tipo de regra de três"
          className="mb-4 inline-flex rounded-lg border border-border p-1"
        >
          {(
            [
              ["directa", "Direta (↑ ↑)"],
              ["inversa", "Inversa (↑ ↓)"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={kind === value}
              onClick={() => {
                setKind(value);
                if (value === "inversa") {
                  setA(6);
                  setB(20);
                  setC(8);
                } else {
                  setA(3);
                  setB(21);
                  setC(5);
                }
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                kind === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mx-auto max-w-md overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm" aria-label="Tabela da regra de três">
            <thead>
              <tr className="bg-muted/40">
                <th className="px-3 py-2 text-left font-medium" scope="col">
                  &nbsp;
                </th>
                <th className="px-3 py-2 text-left font-medium" scope="col">
                  1ª situação
                </th>
                <th className="px-3 py-2 text-left font-medium" scope="col">
                  2ª situação
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <th scope="row" className="px-3 py-2 text-left font-medium text-muted-foreground">
                  {labels[0].name}
                </th>
                <td className="px-3 py-2 tabular-nums">
                  <strong>{fmt(a)}</strong> {labels[0].unit}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  <strong>{fmt(c)}</strong> {labels[0].unit}
                </td>
              </tr>
              <tr className="border-t border-border bg-primary/5">
                <th scope="row" className="px-3 py-2 text-left font-medium text-muted-foreground">
                  {labels[1].name}
                </th>
                <td className="px-3 py-2 tabular-nums">
                  <strong>{fmt(b)}</strong> {labels[1].unit}
                </td>
                <td className="px-3 py-2 font-semibold tabular-nums text-accent-1-ink">
                  {x === null ? "—" : `${fmt(x)} ${labels[1].unit}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          aria-live="polite"
          className={cn(
            "mt-4 rounded-xl p-3 text-sm",
            x === null ? "bg-destructive/10 text-destructive" : "bg-muted/40",
          )}
          role="status"
        >
          {x === null ? (
            <p>
              Valor de {labels[0].name.toLowerCase()} na 1ª situação não pode ser zero —
              não há proporção possível.
            </p>
          ) : kind === "directa" ? (
            <p className="font-mono tabular-nums">
              x = ({fmt(b)} × {fmt(c)}) ÷ {fmt(a)} = {fmt(x)} {labels[1].unit}
            </p>
          ) : (
            <p className="font-mono tabular-nums">
              x = ({fmt(a)} × {fmt(b)}) ÷ {fmt(c)} = {fmt(x)} {labels[1].unit}
            </p>
          )}
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {kind === "directa"
              ? "Direta: as grandezas andam juntas (mais arroz, mais reais)."
              : "Inversa: as grandezas andam em sentidos opostos (mais operários, menos dias) — o produto se mantém."}
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="r3-a" className="text-xs text-muted-foreground">
              {labels[0].name} (1ª): <strong className="text-foreground">{fmt(a)}</strong> {labels[0].unit}
            </label>
            <Slider
              id="r3-a"
              value={[a]}
              onValueChange={([v]) => setA(Math.max(0, v))}
              min={0}
              max={kind === "directa" ? 10 : 20}
              step={1}
              aria-label={`${labels[0].name} na primeira situação`}
            />
          </div>
          <div>
            <label htmlFor="r3-b" className="text-xs text-muted-foreground">
              {labels[1].name} (1ª): <strong className="text-foreground">{fmt(b)}</strong> {labels[1].unit}
            </label>
            <Slider
              id="r3-b"
              value={[b]}
              onValueChange={([v]) => setB(Math.max(0, v))}
              min={0}
              max={100}
              step={1}
              aria-label={`${labels[1].name} na primeira situação`}
            />
          </div>
          <div>
            <label htmlFor="r3-c" className="text-xs text-muted-foreground">
              {labels[0].name} (2ª): <strong className="text-foreground">{fmt(c)}</strong> {labels[0].unit}
            </label>
            <Slider
              id="r3-c"
              value={[c]}
              onValueChange={([v]) => setC(Math.max(0, v))}
              min={0}
              max={kind === "directa" ? 20 : 20}
              step={1}
              aria-label={`${labels[0].name} na segunda situação`}
            />
          </div>
        </div>
      </section>

      <section aria-label="Por que funciona">
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 6 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-4 text-sm leading-relaxed"
        >
          <p>
            Toda regra de três monta uma <strong>proporção</strong> entre as duas
            situações. Na direta, os quocientes são iguais; na inversa, os produtos
            é que se igualam — por isso multiplicamos &ldquo;cruzado&rdquo;. Confira
            sempre a pergunta: <em>as grandezas andam juntas ou em sentidos opostos?</em>
          </p>
        </motion.div>
      </section>
    </div>
  );
}
