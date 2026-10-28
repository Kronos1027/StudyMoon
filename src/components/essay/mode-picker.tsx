"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createEssay } from "@/lib/essay/actions";

interface Props {
  themeId: string;
  title: string;
  kind: string;
}

/** Only a user click may create a new essay (never a GET or page refresh). */
export function EssayModePicker({ themeId, title, kind }: Props) {
  const router = useRouter();
  const [starting, setStarting] = useState<"training" | "exam" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(mode: "training" | "exam") {
    if (starting) return;
    setError(null);
    setStarting(mode);
    try {
      const created = await createEssay({ themeId, mode });
      if (!created.ok) {
        setError(created.error);
        return;
      }
      router.push(`/redacao/${created.essayId}/editar`);
    } catch {
      setError("Não foi possível iniciar a redação. Confira sua conexão.");
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{kind}</p>
      <h1 className="mt-1 text-2xl font-semibold leading-snug">{title}</h1>
      <p className="mb-2 mt-6 text-sm font-medium text-muted-foreground">
        Como você quer escrever?
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          disabled={starting !== null}
          onClick={() => void start("training")}
          className="rounded-2xl bg-brand-gradient p-5 text-left text-white transition-transform hover:scale-[1.01] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          <span className="flex items-center gap-2 text-lg font-semibold">
            {starting === "training" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Modo treino
          </span>
          <span className="mt-2 block text-sm leading-relaxed text-white/85">
            Timer de 30 minutos, avisos visuais e correção com IA ao enviar.
          </span>
        </button>
        <button
          type="button"
          disabled={starting !== null}
          onClick={() => void start("exam")}
          className="rounded-2xl border-2 border-border bg-card p-5 text-left transition-colors hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          <span className="flex items-center gap-2 text-lg font-semibold">
            {starting === "exam" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Modo prova
          </span>
          <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
            Sem cronômetro ou dicas. A correção aparece depois do envio.
          </span>
        </button>
      </div>
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
