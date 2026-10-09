"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Construction } from "lucide-react";
import { demoLoaders, type DemoProps } from "./registry";

interface DemoFrameProps {
  demoId: string;
  /** Parameters from the question/subtopic (e.g. escala-mapa: distanceCm/scale). */
  params?: Record<string, unknown> | null;
  /** compact: tighter presentation for inline use (after a wrong answer) */
  compact?: boolean;
}

/**
 * Loads the interactive simulator by id (client-only, code-split) and passes
 * the question parameters through. Unknown ids show an honest "em
 * construção" state — never fake interactivity.
 */
export function DemoFrame({ demoId, params, compact }: DemoFrameProps) {
  const known = demoId in demoLoaders;
  const [loaded, setLoaded] = useState<{ id: string; Component: ComponentType<DemoProps> } | null>(
    null,
  );

  // Adjust state when the prop changes (React render-phase pattern).
  const [prevDemoId, setPrevDemoId] = useState(demoId);
  if (prevDemoId !== demoId) {
    setPrevDemoId(demoId);
    setLoaded(null);
  }

  useEffect(() => {
    if (!known) return;
    let cancelled = false;
    demoLoaders[demoId]()
      .then((mod) => {
        if (!cancelled) setLoaded({ id: demoId, Component: mod.default });
      })
      .catch(() => {
        /* stays in loading — treated as unknown below only if never resolves */
      });
    return () => {
      cancelled = true;
    };
  }, [demoId, known]);

  if (!known) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        <Construction className="h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          O simulador interativo deste assunto está sendo construído e chega em
          breve. Por enquanto, siga a resolução passo a passo.
        </p>
      </div>
    );
  }

  if (!loaded || loaded.id !== demoId) {
    return (
      <div
        className="flex h-40 animate-pulse items-center justify-center rounded-xl bg-muted/30 text-sm text-muted-foreground"
        role="status"
      >
        Carregando simulação...
      </div>
    );
  }

  const DemoComponent = loaded.Component;
  const safeParams =
    params && typeof params === "object" && !Array.isArray(params) ? params : undefined;
  return (
    <div className={compact ? "" : "rounded-xl border border-border p-4"}>
      <DemoComponent params={safeParams} />
    </div>
  );
}
