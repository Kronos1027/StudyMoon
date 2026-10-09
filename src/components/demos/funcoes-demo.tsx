"use client";

import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { afimRoot, quadraticFeatures } from "@/lib/demos/models";
import { cn } from "@/lib/utils";

type Mode = "afim" | "quadratica";

const W = 560;
const H = 360;
const X_MIN = -10;
const X_MAX = 10;
const Y_MIN = -10;
const Y_MAX = 10;

function toSvgX(x: number): number {
  return ((x - X_MIN) / (X_MAX - X_MIN)) * W;
}
function toSvgY(y: number): number {
  return H - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * H;
}

/**
 * Function graph simulator: coefficients in real time, roots and vertex
 * highlighted. Custom SVG plotter (decision D-009).
 */
export function FuncoesDemo() {
  const [mode, setMode] = useState<Mode>("quadratica");
  const [a, setA] = useState(1);
  const [b, setB] = useState(-2);
  const [c, setC] = useState(-3);

  const isAfim = mode === "afim";

  const { path, points } = useMemo(() => {
    const f = (x: number) =>
      isAfim ? a * x + b : a * x * x + b * x + c;

    const steps: string[] = [];
    for (let i = 0; i <= 400; i++) {
      const x = X_MIN + ((X_MAX - X_MIN) * i) / 400;
      const y = f(x);
      if (y > Y_MAX * 1.5 || y < Y_MIN * 1.5) {
        steps.push("");
        continue;
      }
      steps.push(`${i === 0 ? "M" : "L"} ${toSvgX(x).toFixed(1)} ${toSvgY(y).toFixed(1)}`);
    }

    const markers: Array<{ x: number; y: number; label: string }> = [];

    if (isAfim) {
      const root = afimRoot(a, b);
      if (root !== null && root >= X_MIN && root <= X_MAX) {
        markers.push({ x: root, y: 0, label: `raiz x = ${format(root)}` });
      }
      markers.push({ x: 0, y: b, label: `onde corta o eixo y: b = ${format(b)}` });
    } else {
      const { delta, roots, vertex } = quadraticFeatures(a, b, c);
      if (vertex && Math.abs(a) > 0.01) {
        markers.push({ x: vertex.x, y: vertex.y, label: `vértice (${format(vertex.x)}, ${format(vertex.y)})` });
        if (roots && roots.length === 2) {
          for (const r of roots) {
            if (r >= X_MIN && r <= X_MAX) {
              markers.push({ x: r, y: 0, label: `raiz x = ${format(r)}` });
            }
          }
        } else if (roots && roots.length === 1) {
          markers.push({ x: roots[0], y: 0, label: `raiz dupla x = ${format(roots[0])}` });
        }
        void delta;
      }
    }

    // filter markers inside the visible window
    const visible = markers.filter(
      (m) => m.x >= X_MIN && m.x <= X_MAX && m.y >= Y_MIN && m.y <= Y_MAX,
    );
    return { path: steps.filter(Boolean).join(" "), points: visible };
  }, [a, b, c, isAfim]);

  const equation = isAfim
    ? `f(x) = ${format(a)}x ${b >= 0 ? "+" : "−"} ${format(Math.abs(b))}`
    : `f(x) = ${format(a)}x² ${b >= 0 ? "+" : "−"} ${format(Math.abs(b))}x ${c >= 0 ? "+" : "−"} ${format(Math.abs(c))}`;

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Tipo de função"
        className="inline-flex rounded-lg border border-border p-1"
      >
        {(
          [
            ["afim", "1º grau"],
            ["quadratica", "2º grau"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-[1fr_200px]">
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full rounded-xl bg-muted/20"
            role="img"
            aria-label={`Gráfico de ${equation}`}
          >
            {/* grid */}
            {Array.from({ length: 21 }, (_, i) => {
              const x = X_MIN + i;
              return (
                <line
                  key={`gx-${i}`}
                  x1={toSvgX(x)} y1={0} x2={toSvgX(x)} y2={H}
                  stroke="var(--border)" strokeWidth={x === 0 ? 1.5 : 0.5}
                  opacity={x === 0 ? 0.9 : 0.5}
                />
              );
            })}
            {Array.from({ length: 21 }, (_, i) => {
              const y = Y_MIN + i;
              return (
                <line
                  key={`gy-${i}`}
                  x1={0} y1={toSvgY(y)} x2={W} y2={toSvgY(y)}
                  stroke="var(--border)" strokeWidth={y === 0 ? 1.5 : 0.5}
                  opacity={y === 0 ? 0.9 : 0.5}
                />
              );
            })}
            {/* numbers on axes */}
            {[-10, -5, 5, 10].map((n) => (
              <text key={`tx-${n}`} x={toSvgX(n)} y={toSvgY(0) + 14} fontSize="10" fill="var(--muted-foreground)" textAnchor="middle">
                {n}
              </text>
            ))}
            {[-10, -5, 5, 10].map((n) => (
              <text key={`ty-${n}`} x={toSvgX(0) - 8} y={toSvgY(n) + 3} fontSize="10" fill="var(--muted-foreground)" textAnchor="end">
                {n}
              </text>
            ))}

            {/* curve */}
            <path
              d={path}
              fill="none"
              stroke="url(#fn-gradient)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="fn-gradient" x1="0" y1="0" x2={W} y2="0">
                <stop offset="0%" stopColor="#6d5dfc" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>

            {/* markers */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={toSvgX(p.x)}
                  cy={toSvgY(p.y)}
                  r={5}
                  fill="var(--accent-2)"
                  stroke="var(--background)"
                  strokeWidth={2}
                />
                <text
                  x={toSvgX(p.x) + 8}
                  y={toSvgY(p.y) - 8}
                  fontSize="11"
                  fill="var(--foreground)"
                >
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="space-y-4">
          <p className="rounded-lg bg-card px-3 py-2 text-center font-mono text-sm">
            {equation}
          </p>
          <div>
            <label className="text-xs text-muted-foreground">
              a = <strong className="text-foreground">{format(a)}</strong>
              {!isAfim && Math.abs(a) < 0.01 ? " (reto!)" : ""}
            </label>
            <Slider value={[a]} onValueChange={([v]) => setA(v)} min={-3} max={3} step={0.1} aria-label="Coeficiente a" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              b = <strong className="text-foreground">{format(b)}</strong>
            </label>
            <Slider value={[b]} onValueChange={([v]) => setB(v)} min={-10} max={10} step={0.5} aria-label="Coeficiente b" />
          </div>
          {!isAfim ? (
            <div>
              <label className="text-xs text-muted-foreground">
                c = <strong className="text-foreground">{format(c)}</strong>
              </label>
              <Slider value={[c]} onValueChange={([v]) => setC(v)} min={-10} max={10} step={0.5} aria-label="Coeficiente c" />
            </div>
          ) : null}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {isAfim
              ? "a é a inclinação (a > 0 cresce, a < 0 decresce); b é onde a reta corta o eixo y."
              : "a > 0 parábola para cima (vértice = mínimo); a < 0 para baixo (vértice = máximo). As raízes são onde ela corta o eixo x."}
          </p>
        </div>
      </div>
    </div>
  );
}

function format(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return rounded.toString().replace(".", ",");
}
