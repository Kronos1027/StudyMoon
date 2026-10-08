"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface AccuracyPoint {
  day: string;
  accuracy: number | null;
}

/** Evolution of correct answers over the last days (line, doc section 6.5). */
export function AccuracyLine({ data }: { data: AccuracyPoint[] }) {
  const points = data.filter((d) => d.accuracy !== null);
  if (points.length < 2) {
    return (
      <p className="flex h-full min-h-40 items-center justify-center text-center text-sm text-muted-foreground">
        Responda algumas questões para ver sua evolução aqui.
      </p>
    );
  }

  return (
    <div className="h-40 w-full" role="img" aria-label="Gráfico de evolução de acertos nos últimos dias">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            stroke="var(--border)"
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, "Acertos"]}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--popover-foreground)",
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "var(--chart-1)" }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
