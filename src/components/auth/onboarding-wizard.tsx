"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlarmClock,
  CalendarDays,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Moon,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "@/lib/auth/actions";

interface OnboardingData {
  targetExamDate: string;
  dailyHours: number;
  preferredTime: string;
  targetScore: number | null;
  notifyPush: boolean;
}

const STEPS = [
  { icon: CalendarDays, title: "Quando é a sua prova?" },
  { icon: AlarmClock, title: "Quanto tempo por dia?" },
  { icon: Target, title: "Qual é a sua meta?" },
  { icon: Bell, title: "Lembretes que chegam de verdade" },
] as const;

const SCORE_OPTIONS: Array<{ value: number | null; label: string; hint: string }> = [
  { value: null, label: "Aprender do zero", hint: "Sem pressa de nota" },
  { value: 450, label: "450+", hint: "Abrir portas" },
  { value: 550, label: "550+", hint: "Vários cursos" },
  { value: 650, label: "650+", hint: "Cursos concorridos" },
  { value: 750, label: "750+", hint: "Topo da tabela" },
];

function defaultExamDate(): string {
  // Next ENEM edition: first Sunday of November by convention; the user
  // adjusts if needed. Computed, not hardcoded to a year.
  const now = new Date();
  const year = now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
  const firstSunday = new Date(year, 10, 1);
  while (firstSunday.getDay() !== 0) firstSunday.setDate(firstSunday.getDate() + 1);
  return firstSunday.toISOString().split("T")[0];
}

export function OnboardingWizard({ initialApelido }: { initialApelido: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionAsked, setPermissionAsked] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    targetExamDate: defaultExamDate(),
    dailyHours: 2,
    preferredTime: "19:00",
    targetScore: null,
    notifyPush: false,
  });

  const daysUntilExam = useMemo(() => {
    const diff = new Date(data.targetExamDate + "T00:00:00").getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }, [data.targetExamDate]);

  function canAdvance(): boolean {
    if (step === 0) return Boolean(data.targetExamDate);
    return true;
  }

  async function askNotificationPermission() {
    setPermissionAsked(true);
    if (typeof Notification === "undefined") return;
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === "granted";
      setData((d) => ({ ...d, notifyPush: granted }));
      if (granted) {
        // Register the push subscription (best effort — requires HTTPS+SW).
        await registerPushSubscription();
      }
    } catch {
      setData((d) => ({ ...d, notifyPush: false }));
    }
  }

  async function registerPushSubscription() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: await fetchVapidKey(),
        }));
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
    } catch (err) {
      console.warn("[push] subscription skipped:", err);
    }
  }

  async function finish(notify: boolean) {
    setSaving(true);
    setError(null);
    const result = await completeOnboarding({ ...data, notifyPush: notify });
    if (!result.ok) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.replace("/painel");
    router.refresh();
  }

  const StepIcon = STEPS[step].icon;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3" aria-hidden="true">
        <Moon className="h-6 w-6 text-accent-1-ink" />
        <div>
          <p className="text-sm text-muted-foreground">Olá, {initialApelido}</p>
          <h1 className="text-lg font-semibold leading-tight">Vamos montar seu plano</h1>
        </div>
      </div>

      <div className="mb-6 flex gap-1.5" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= step ? "bg-brand-gradient" : "bg-muted",
            )}
          />
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <StepIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="text-lg font-semibold">{STEPS[step].title}</h2>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {step === 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="exam-date">Data da prova (1º dia)</Label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={data.targetExamDate}
                    onChange={(e) =>
                      setData((d) => ({ ...d, targetExamDate: e.target.value }))
                    }
                  />
                </div>
                {data.targetExamDate ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Faltam <strong className="text-foreground">{daysUntilExam} dias</strong>. Dá tempo de construir uma base sólida — um passo por dia.
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <Label>Horas de estudo por dia</Label>
                    <span className="text-2xl font-semibold text-accent-1-ink">
                      {data.dailyHours.toString().replace(".", ",")}h
                    </span>
                  </div>
                  <Slider
                    value={[data.dailyHours]}
                    min={0.5}
                    max={6}
                    step={0.5}
                    onValueChange={([v]) => setData((d) => ({ ...d, dailyHours: v }))}
                    aria-label="Horas de estudo por dia"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>30 min</span>
                    <span>6 h</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pref-time">Melhor horário para estudar</Label>
                  <Input
                    id="pref-time"
                    type="time"
                    value={data.preferredTime}
                    onChange={(e) =>
                      setData((d) => ({ ...d, preferredTime: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    É quando enviaremos seu lembrete diário.
                  </p>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Meta de nota">
                {SCORE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    role="radio"
                    aria-checked={data.targetScore === opt.value}
                    onClick={() => setData((d) => ({ ...d, targetScore: opt.value }))}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-all hover:border-primary/60",
                      data.targetScore === opt.value
                        ? "border-primary bg-primary/10"
                        : "border-border",
                    )}
                  >
                    <span className="block text-sm font-semibold">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Estudar todo dia é o que mais importa. Com sua permissão,
                  enviamos <strong className="text-foreground">um lembrete curto no horário que você escolheu</strong> — e
                  avisamos quando sua sequência estiver em risco. No máximo 2
                  por dia, nunca entre 22h e 7h, e você pode desligar quando
                  quiser.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={askNotificationPermission}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all hover:border-primary/60",
                      data.notifyPush ? "border-primary bg-primary/10" : "border-border",
                    )}
                    aria-pressed={data.notifyPush}
                  >
                    <Bell className="h-6 w-6" aria-hidden="true" />
                    <span className="text-sm font-medium">Quero lembretes</span>
                    {data.notifyPush ? (
                      <span className="text-xs text-success">Ativado</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Toque para ativar</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setData((d) => ({ ...d, notifyPush: false }))}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all hover:border-primary/60",
                      !data.notifyPush && permissionAsked ? "border-primary bg-primary/10" : "border-border",
                    )}
                    aria-pressed={!data.notifyPush && permissionAsked}
                  >
                    <BellOff className="h-6 w-6" aria-hidden="true" />
                    <span className="text-sm font-medium">Sem lembretes</span>
                    <span className="text-xs text-muted-foreground">Prefiro sem</span>
                  </button>
                </div>
                {permissionAsked ? (
                  <p className="text-xs text-muted-foreground">
                    No iPhone, os avisos só chegam com o site instalado na
                    tela de início — mostramos como quando for a hora.
                  </p>
                ) : null}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {error ? (
          <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>
        ) : null}

        <div className="mt-8 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => canAdvance() && setStep((s) => s + 1)} disabled={!canAdvance()}>
              Continuar
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button type="button" onClick={() => finish(data.notifyPush)} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {saving ? "Salvando..." : "Começar a estudar"}
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}

/** Fetches the VAPID public key from the server and converts it for subscribe(). */
async function fetchVapidKey(): Promise<string | undefined> {
  try {
    const res = await fetch("/api/push/public-key");
    if (!res.ok) return undefined;
    const { publicKey } = (await res.json()) as { publicKey?: string };
    return publicKey;
  } catch {
    return undefined;
  }
}
