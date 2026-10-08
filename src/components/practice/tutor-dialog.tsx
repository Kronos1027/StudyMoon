"use client";

import { useState } from "react";
import { Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TutorDialogProps {
  questionId: string;
  hintsShown: number;
}

interface TutorTurn {
  role: "student" | "tutor";
  text: string;
}

/**
 * Socratic AI tutor chat (doc section 9): hints before answers, short
 * replies, everything labeled as AI.
 */
export function TutorDialog({ questionId, hintsShown }: TutorDialogProps) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<TutorTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  async function ask() {
    const text = input.trim();
    if (!text || loading) return;
    setTurns((t) => [...t, { role: "student", text }]);
    setInput("");
    setLoading(true);
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, studentQuestion: text, hintLevel: hintsShown }),
      });
      const data = (await response.json()) as {
        reply?: string;
        gaveAnswer?: boolean;
        message?: string;
      };
      const fallback = data.message ?? "O tutor se distraiu — tenta de novo?";
      if (response.status === 429) {
        setLimitReached(true);
        setTurns((t) => [...t, { role: "tutor", text: fallback }]);
      } else if (!response.ok || !data.reply) {
        setTurns((t) => [...t, { role: "tutor", text: fallback }]);
      } else {
        const replyText: string = data.reply;
        setTurns((t) => [...t, { role: "tutor", text: replyText }]);
      }
    } catch {
      setTurns((t) => [
        ...t,
        { role: "tutor", text: "Sem conexão com o tutor agora." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        Perguntar ao tutor
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" aria-hidden="true" />
              Tutor StudyMoon
            </DialogTitle>
            <DialogDescription>
              Ele conduz com dicas em vez de entregar a resposta. Até 20
              perguntas por dia.
            </DialogDescription>
          </DialogHeader>

          <div
            className="scroll-moon flex max-h-72 min-h-24 flex-col gap-2 overflow-y-auto rounded-xl bg-muted/30 p-3"
            role="log"
            aria-label="Conversa com o tutor"
          >
            {turns.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Pergunte algo como: “por onde eu começo?” ou “o que significa
                essa parte do enunciado?”
              </p>
            ) : (
              turns.map((turn, i) => (
                <div
                  key={i}
                  className={
                    turn.role === "student"
                      ? "ml-8 rounded-xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : "mr-8 rounded-xl rounded-tl-sm border border-border bg-card px-3 py-2 text-sm"
                  }
                >
                  {turn.text}
                </div>
              ))
            )}
            {loading ? (
              <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                pensando...
              </div>
            ) : null}
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void ask();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={limitReached ? "Limite de hoje atingido" : "Sua dúvida..."}
              disabled={loading || limitReached}
              maxLength={600}
              aria-label="Sua pergunta para o tutor"
            />
            <Button type="submit" size="icon" disabled={loading || limitReached || !input.trim()}>
              <Send className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Enviar</span>
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
