"use client";

import type { ComponentType } from "react";

/**
 * Registry of interactive simulators (doc section 12).
 * Each entry is lazily loaded — only the demo in view ships to the client.
 */
const registry: Record<string, () => Promise<{ default: ComponentType }>> = {
  porcentagem: () => import("./porcentagem-demo"),
  fracoes: () => import("./fracoes-demo"),
  funcoes: () => import("./funcoes-demo"),
  divisao: () => import("./divisao-demo"),
  "razao-proporcao": () => import("./razao-proporcao-demo"),
  probabilidade: () => import("./probabilidade-demo"),
  estatistica: () => import("./estatistica-demo"),
  biologia: () => import("./biologia-demo"),
  balanceamento: () => import("./balanceamento-demo"),
  phet: () => import("./phet-demo"),
  textos: () => import("./textos-demo"),
  "linha-tempo": () => import("./linha-tempo-demo"),
  geometria: () => import("./geometria-demo"),
  mapas: () => import("./mapas-demo"),
};

const cache = new Map<string, ComponentType>();

/** Returns the (resolved) component for a demo id, or null when unknown. */
export function dynamic(demoId: string): ComponentType | null {
  if (cache.has(demoId)) return cache.get(demoId)!;
  const loader = registry[demoId];
  if (!loader) return null;

  // Start loading and render a lightweight placeholder until resolved.
  let resolved: ComponentType | null = null;
  const Loading = function DemoLoading() {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-muted/30 text-sm text-muted-foreground">
        Carregando simulação...
      </div>
    );
  };
  resolved = Loading;
  cache.set(demoId, Loading);

  void loader().then((mod) => {
    cache.set(demoId, mod.default);
    // Force a re-render of frames currently mounted.
    window.dispatchEvent(new CustomEvent("demo-loaded", { detail: demoId }));
  });
  return cache.get(demoId)!;
}
