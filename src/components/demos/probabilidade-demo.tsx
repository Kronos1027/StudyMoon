"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";


/**
 * Probability tree: two-branch stages with editable probabilities;
 * paths multiply and light up on hover (doc section 12).
 */
export function ProbabilidadeDemo() {
  const [pA, setPA] = useState(60); // percentage
  const [hoverPath, setHoverPath] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const p = pA / 100;
  const paths = [
    { key: "AA", label: "A e A", prob: p * p },
    { key: "AB", label: "A e B", prob: p * (1 - p) },
    { key: "BA", label: "B e A", prob: (1 - p) * p },
    { key: "BB", label: "B e B", prob: (1 - p) * (1 - p) },
  ];
  const atLeastOneA = 1 - paths[3].prob;

  return (
    <div className="space-y-6">
      <section aria-label="Árvore de probabilidades">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Duas etapas: a chance de cada caminho se multiplica
          </h3>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            P(A) por etapa:
            <input
              type="range"
              min={5}
              max={95}
              value={pA}
              onChange={(e) => setPA(Number(e.target.value))}
              className="w-32 accent-[#6d5dfc]"
              aria-label="Probabilidade de A em porcentagem"
            />
            <strong className="text-foreground tabular-nums">{pA}%</strong>
          </label>
        </div>

        <div className="overflow-x-auto scroll-moon pb-2">
          <svg
            viewBox="0 0 520 260"
            className="min-w-[480px]"
            role="img"
            aria-label={`Árvore com duas etapas; probabilidade de A é ${pA}%`}
          >
            {/* stage 1 */}
            <line x1="40" y1="130" x2="170" y2="70" stroke="var(--primary)" strokeWidth={2.5} />
            <line x1="40" y1="130" x2="170" y2="190" stroke="var(--accent-2)" strokeWidth={2.5} />
            <text x="95" y="88" fontSize="12" fill="var(--muted-foreground)">{pA}%</text>
            <text x="95" y="178" fontSize="12" fill="var(--muted-foreground)">{100 - pA}%</text>

            {/* stage 2 from A */}
            <line x1="170" y1="70" x2="320" y2="40" stroke="var(--primary)" strokeWidth={hoverPath === "AA" ? 4 : 2} />
            <line x1="170" y1="70" x2="320" y2="105" stroke="var(--accent-2)" strokeWidth={hoverPath === "AB" ? 4 : 2} />
            <text x="230" y="45" fontSize="12" fill="var(--muted-foreground)">{pA}%</text>
            <text x="230" y="102" fontSize="12" fill="var(--muted-foreground)">{100 - pA}%</text>

            {/* stage 2 from B */}
            <line x1="170" y1="190" x2="320" y2="155" stroke="var(--primary)" strokeWidth={hoverPath === "BA" ? 4 : 2} />
            <line x1="170" y1="190" x2="320" y2="220" stroke="var(--accent-2)" strokeWidth={hoverPath === "BB" ? 4 : 2} />
            <text x="230" y="160" fontSize="12" fill="var(--muted-foreground)">{pA}%</text>
            <text x="230" y="217" fontSize="12" fill="var(--muted-foreground)">{100 - pA}%</text>

            {/* node labels */}
            <circle cx="40" cy="130" r="7" fill="var(--foreground)" />
            <text x="150" y="66" fontSize="13" fill="var(--foreground)">A</text>
            <text x="150" y="200" fontSize="13" fill="var(--foreground)">B</text>

            {/* leaves */}
            {paths.map((path, i) => (
              <g
                key={path.key}
                onMouseEnter={() => setHoverPath(path.key)}
                onMouseLeave={() => setHoverPath(null)}
                style={{ cursor: "pointer" }}
              >
                <motion.circle
                  cx={330} cy={[40, 105, 155, 220][i]} r={8}
                  fill={hoverPath === path.key ? "var(--primary)" : "var(--muted)"}
                  animate={reduced ? undefined : { scale: hoverPath === path.key ? 1.4 : 1 }}
                />
                <text
                  x={348} y={[44, 109, 159, 224][i]}
                  fontSize="12" fill="var(--foreground)"
                >
                  {path.label} = {(path.prob * 100).toFixed(1).replace(".", ",")}%
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="rounded-xl bg-muted/30 p-3 text-sm">
          <p className="flex justify-between">
            <span className="text-muted-foreground">Soma dos 4 caminhos (tem que dar 100%)</span>
            <span className="tabular-nums font-medium">
              {(paths.reduce((s, x) => s + x.prob, 0) * 100).toFixed(1).replace(".", ",")}%
            </span>
          </p>
          <p className="mt-1 flex justify-between">
            <span className="text-muted-foreground">
              Pelo menos um A (complementar do "B e B")
            </span>
            <span className="tabular-nums font-semibold text-accent-1-ink">
              {(atLeastOneA * 100).toFixed(1).replace(".", ",")}%
            </span>
          </p>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Toque em um círculo para destacar o caminho. Exemplo real: dois
          lançamentos de moeda, dois sorteios, transmissão de duas características.
        </p>
      </section>
    </div>
  );
}
