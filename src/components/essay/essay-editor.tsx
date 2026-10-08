"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Save,
  Send,
  Timer,
  TimerReset,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/content/markdown";
import { correctEssay, saveEssayDraft, type EssayCorrectionResult } from "@/lib/essay/actions";
import { cn } from "@/lib/utils";

interface EssayEditorProps {
  essayId: string;
  themeTitle: string;
  motivatingTexts: Array<{ source: string; text: string }>;
  mode: "training" | "exam";
}

const TRAINING_SECONDS = 30 * 60;
const AUTOSAVE_MS = 15_000;

/**
 * Essay editor (doc section 6.10): motivating texts, line/word counters,
 * 30-minute timer in training mode, autosave, and AI correction on submit
 * (always labeled as an estimate).
 */
export function EssayEditor({
  essayId,
  themeTitle,
  motivatingTexts,
  mode,
}: EssayEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [timerRunning, setTimerRunning] = useState(mode === "training");
  const [secondsLeft, setSecondsLeft] = useState(TRAINING_SECONDS);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EssayCorrectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef("");
  const reduced = useReducedMotion();

  // Keep the ref in sync outside render (autosave reads it in callbacks).
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Countdown (training mode).
  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, secondsLeft]);

  // Autosave.
  const save = useCallback(async () => {
    if (!contentRef.current) return;
    setSaved("saving");
    await saveEssayDraft({ essayId, content: contentRef.current });
    setSaved("saved");
  }, [essayId]);

  useEffect(() => {
    const interval = setInterval(() => void save(), AUTOSAVE_MS);
    return () => clearInterval(interval);
  }, [save]);

  // Save on unload.
  useEffect(() => {
    const handler = () => {
      if (contentRef.current) {
        void saveEssayDraft({ essayId, content: contentRef.current });
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [essayId]);

  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const lines = Math.max(0, Math.ceil(words / 14)); // ~14 words/handwritten line
  const timeUp = mode === "training" && secondsLeft === 0;

  async function submit() {
    if (words < 30) {
      setError("Escreva pelo menos 30 palavras antes de enviar.");
      return;
    }
    setError(null);
    setSubmitting(true);
    await save();
    const response = await correctEssay({ essayId });
    setSubmitting(false);
    setResult(response);
    if (response.ok) router.refresh();
  }

  // ---------- Correction result ----------
  if (result?.ok) {
    const maxScore = Math.max(...(result.competencies?.map((c) => c.score) ?? [0]));
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: 16 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="rounded-2xl bg-brand-gradient p-6 text-center text-white">
            <p className="text-sm uppercase tracking-wide opacity-90">
              Estimativa feita por IA
            </p>
            <p className="mt-1 text-5xl font-bold tabular-nums">
              {result.totalScore}
            </p>
            <p className="mt-1 text-sm opacity-90">
              de 1000 · a nota real vem dos avaliadores do INEP
            </p>
          </div>

          {result.zeroReason ? (
            <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
              {result.zeroReason === "em_branco" && "Texto em branco: nota zero, como na regra do exame."}
              {result.zeroReason === "fuga_tema" && "Fuga total ao tema: a competência 2 recebe nota zero."}
              {result.zeroReason === "copia_motivadores" && "Cópia dos textos motivadores: desconto severo, como no exame."}
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">
              Nota por competência
            </h2>
            <div className="space-y-4">
              {result.competencies?.map((c) => (
                <div key={c.key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{c.key}</span>
                    <span className="tabular-nums">{c.score}/200</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-brand-gradient"
                      initial={reduced ? { width: `${(c.score / 200) * 100}%` } : { width: 0 }}
                      animate={{ width: `${(c.score / maxScore) * 100}%` }}
                      transition={{ duration: reduced ? 0 : 0.8 }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {c.justification}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {result.improvements && result.improvements.length > 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                3 melhorias priorizadas
              </h2>
              <ol className="list-decimal space-y-2 pl-5 text-sm">
                {result.improvements.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {result.rewriteExample ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Exemplo: um parágrafo reescrito
              </h2>
              <Markdown content={result.rewriteExample} />
            </div>
          ) : null}

          <div className="flex justify-center gap-3">
            <Button onClick={() => router.push("/redacao")}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Voltar para redações
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---------- Editor ----------
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold leading-snug">{themeTitle}</h1>
        <p className="text-xs text-muted-foreground">
          {mode === "training" ? "Modo treino · timer de 30 min" : "Modo prova · sem ajuda até enviar"}
        </p>
      </header>

      {/* Motivating texts */}
      <section className="mb-5 space-y-3" aria-label="Textos motivadores">
        {motivatingTexts.map((text, i) => (
          <blockquote
            key={i}
            className="rounded-xl border-l-4 border-primary/60 bg-muted/20 p-4 text-sm leading-relaxed"
          >
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {text.source}
            </p>
            {text.text}
          </blockquote>
        ))}
        <p className="text-center text-xs text-muted-foreground">
          Com base nos textos motivadores, redija um texto dissertativo-argumentativo
          sobre o tema, em até 30 linhas.
        </p>
      </section>

      {/* Editor */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva sua redação aqui. Estrutura sugerida: introdução com tese, 2 parágrafos de desenvolvimento e conclusão com proposta de intervenção completa."
          className="min-h-[420px] resize-none border-0 bg-transparent text-base leading-7 focus-visible:ring-0"
          aria-label="Sua redação"
          disabled={submitting}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="tabular-nums">{words} palavras</span>
            <span className="tabular-nums">≈ {lines}/30 linhas</span>
            <span className="flex items-center gap-1">
              {saved === "saving" ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  salvando
                </>
              ) : saved === "saved" ? (
                <>
                  <Save className="h-3 w-3" aria-hidden="true" />
                  salvo automaticamente
                </>
              ) : null}
            </span>
          </div>
          {mode === "training" ? (
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 font-mono tabular-nums",
                timeUp
                  ? "bg-destructive/10 text-destructive"
                  : secondsLeft < 300
                    ? "bg-accent-2/10 text-accent-2-ink"
                    : "bg-muted",
              )}
              role="timer"
              aria-label={`Tempo restante: ${Math.floor(secondsLeft / 60)} minutos`}
            >
              {timerRunning ? (
                <Timer className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <TimerReset className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {timeUp
                ? "tempo esgotado"
                : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`}
            </span>
          ) : null}
        </div>
      </div>

      {timeUp ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-accent-2/10 p-3 text-sm text-accent-2-ink" role="status">
          <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
          Tempo de treino esgotado — finalize e envie, ou continue sem o timer.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex items-center justify-between">
        <Button variant="outline" onClick={() => void save()}>
          <Save className="h-4 w-4" aria-hidden="true" />
          Salvar rascunho
        </Button>
        <Button onClick={() => void submit()} disabled={submitting || words < 30} size="lg">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Corrigindo com IA...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Enviar para correção
            </>
          )}
        </Button>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        A correção é uma <strong>estimativa feita por IA</strong> seguindo a
        rubrica oficial das 5 competências — pode conter variações em relação
        aos avaliadores do INEP.
      </p>
    </div>
  );
}
