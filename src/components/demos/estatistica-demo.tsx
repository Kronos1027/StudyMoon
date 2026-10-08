"use client";

import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Datum {
  name: string;
  valor: number;
}

/**
 * Statistics simulator: editable dataset — add/remove values, see mean,
 * median and mode update live (doc section 12: histogram that changes).
 */
export function EstatisticaDemo() {
  const [data, setData] = useState<Datum[]>([
    { name: "Ana", valor: 6 },
    { name: "Bia", valor: 7 },
    { name: "Caio", valor: 8 },
    { name: "Duda", valor: 9 },
    { name: "Eva", valor: 3 },
  ]);

  const values = data.map((d) => d.valor).sort((a, b) => a - b);
  const n = values.length;
  const mean = n > 0 ? values.reduce((s, v) => s + v, 0) / n : 0;
  const median = n === 0 ? 0 : n % 2 === 1 ? values[(n - 1) / 2] : (values[n / 2 - 1] + values[n / 2]) / 2;
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const maxCount = Math.max(...counts.values());
  const modes = [...counts.entries()].filter(([, c]) => c === maxCount && c > 1).map(([v]) => v);

  function changeValue(index: number, delta: number) {
    setData((d) =>
      d.map((item, i) =>
        i === index
          ? { ...item, valor: Math.max(0, Math.min(10, item.valor + delta)) }
          : item,
      ),
    );
  }
  function addPerson() {
    const names = ["Fábio", "Gabi", "Hugo", "Ivo", "Júlia", "Kaique", "Lia", "Marcos", "Nina", "Otávio"];
    const name = names[data.length % names.length];
    setData((d) => [...d, { name, valor: Math.ceil(Math.random() * 10) }]);
  }

  return (
    <div className="space-y-5">
      <section aria-label="Dados editáveis">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Notas de uma turma — mexa nos valores
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addPerson} disabled={data.length >= 10}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Aluno
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setData((d) => d.slice(0, -1))}
              disabled={data.length <= 2}
            >
              <Minus className="h-4 w-4" aria-hidden="true" />
              Remover
            </Button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {data.map((item, i) => (
            <div
              key={item.name + i}
              className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1"
            >
              <span className="text-xs text-muted-foreground">{item.name}</span>
              <button
                onClick={() => changeValue(i, -1)}
                className="rounded px-1.5 text-sm hover:bg-muted"
                aria-label={`Diminuir nota de ${item.name}`}
              >
                −
              </button>
              <span
                className={cn(
                  "w-6 text-center font-semibold tabular-nums",
                  item.valor === mean ? "text-accent-1-ink" : "",
                )}
              >
                {item.valor}
              </span>
              <button
                onClick={() => changeValue(i, 1)}
                className="rounded px-1.5 text-sm hover:bg-muted"
                aria-label={`Aumentar nota de ${item.name}`}
              >
                +
              </button>
            </div>
          ))}
        </div>

        <div className="h-44" role="img" aria-label="Gráfico de barras das notas">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -25 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip
                formatter={(value) => [`${value}`, "Nota"]}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="valor" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section aria-label="Medidas" className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Média</p>
          <p className="text-xl font-semibold text-accent-1-ink tabular-nums">
            {mean.toFixed(1).replace(".", ",")}
          </p>
        </div>
        <div className="rounded-xl bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Mediana</p>
          <p className="text-xl font-semibold text-accent-2-ink tabular-nums">
            {median.toString().replace(".", ",")}
          </p>
        </div>
        <div className="rounded-xl bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Moda</p>
          <p className="text-xl font-semibold tabular-nums">
            {modes.length > 0 ? modes.join(" e ") : "—"}
          </p>
        </div>
      </section>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Coloque uma nota muito baixa em um aluno e veja a média cair enquanto a
        mediana quase não se mexe — é por isso que a mediana representa melhor
        o "típico" quando há valores extremos.
      </p>
    </div>
  );
}
