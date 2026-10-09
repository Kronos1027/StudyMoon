"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Interactive text annotation: tap highlighted fragments to reveal the
 * language concept behind them (doc section 12: Linguagens).
 */
const FRAGMENTS: Array<{
  id: number;
  text: string;
  concept: string;
  explanation: string;
}> = [
  {
    id: 1,
    text: "a notificação de celular é um chicote silencioso",
    concept: "Metáfora",
    explanation:
      "Compara a notificação a um chicote sem usar 'como': identificação direta entre dois elementos de mundos diferentes.",
  },
  {
    id: 2,
    text: "bilhões de vezes por dia",
    concept: "Hipérbole",
    explanation:
      "Exagero intencional para intensificar a crítica — ninguém contou os bilhões, e não é para levar ao pé da letra.",
  },
  {
    id: 3,
    text: "Quem manda mesmo?",
    concept: "Interação por apelo (função conativa)",
    explanation:
      "A pergunta direta ao leitor mobiliza o interlocutor: linguagem típica de campanhas e textos argumentativos.",
  },
  {
    id: 4,
    text: "a tecnologia que prometia libertar",
    concept: "Ironia",
    explanation:
      "O verbo 'prometia' contrasta com a realidade descrita no texto: a promessa de liberdade virou escravidão digital. Diz-se uma coisa para significar a oposta — a crítica fica mais forte.",
  },
];

export function TextosDemo() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-medium text-muted-foreground">
        Toque nos trechos destacados para revelar o conceito de linguagem
      </h3>

      <blockquote className="rounded-xl border-l-4 border-primary/60 bg-muted/20 p-5 text-[1.05rem] leading-relaxed">
        Quem manda mesmo{" "}
        <Mark active={open === 3} onClick={() => setOpen(open === 3 ? null : 3)} />,
        na sua relação com o celular, é o aplicativo:{" "}
        <Mark active={open === 1} onClick={() => setOpen(open === 1 ? null : 1)} /> —{" "}
        e ele é acionado{" "}
        <Mark active={open === 2} onClick={() => setOpen(open === 2 ? null : 2)} />,{" "}
        enquanto{" "}
        <Mark active={open === 4} onClick={() => setOpen(open === 4 ? null : 4)} />{" "}
        acaba escravizando seus usuários.
      </blockquote>

      {open !== null ? (
        <div className="rounded-xl border border-accent-2/40 bg-accent-2/5 p-4" role="status">
          <p className="font-semibold text-accent-2-ink">
            {FRAGMENTS.find((f) => f.id === open)?.concept}
          </p>
          <p className="mt-1 text-sm">
            {FRAGMENTS.find((f) => f.id === open)?.explanation}
          </p>
          <p className="mt-2 text-xs italic text-muted-foreground">
            “{FRAGMENTS.find((f) => f.id === open)?.text}”
          </p>
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          Cada trecho colorido esconde uma figura de linguagem ou função do texto.
        </p>
      )}
    </div>
  );
}

function Mark({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "mx-0.5 inline-block h-5 w-16 cursor-pointer rounded-md align-middle transition-all",
        active
          ? "bg-accent-2 ring-2 ring-accent-2"
          : "bg-brand-gradient/70 hover:bg-brand-gradient",
      )}
      aria-label="Trecho destacado — toque para revelar o conceito"
    />
  );
}
