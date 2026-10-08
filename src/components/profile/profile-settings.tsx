"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateProfileSettings, deleteAccount } from "@/lib/profile/actions";

const settingsSchema = z.object({
  apelido: z.string().min(2).max(24),
  birthDate: z.string().min(1, "Informe sua data de nascimento"),
  targetExamDate: z.string().min(1, "Informe a data da prova"),
  dailyHours: z.number().min(0.5).max(10),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/),
  notifyPush: z.boolean(),
  weeklySummary: z.boolean(),
  overloadGuard: z.boolean(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

interface ProfileSettingsProps {
  initial: SettingsForm;
  streakLongest: number;
}

export function ProfileSettings({ initial, streakLongest }: ProfileSettingsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: SettingsForm) {
    setSaving(true);
    setStatus(null);
    const result = await updateProfileSettings(values);
    setStatus(
      result.ok ? "Configurações salvas." : result.error ?? "Erro ao salvar.",
    );
    setSaving(false);
    if (result.ok) router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="apelido">Apelido</Label>
          <Input id="apelido" maxLength={24} {...register("apelido")} />
          {errors.apelido ? (
            <p className="text-sm text-destructive">{errors.apelido.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthDate">Nascimento</Label>
          <Input id="birthDate" type="date" {...register("birthDate")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetExamDate">Data da prova</Label>
          <Input id="targetExamDate" type="date" {...register("targetExamDate")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="preferredTime">Horário de estudo</Label>
          <Input id="preferredTime" type="time" {...register("preferredTime")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="dailyHours">
            Horas por dia: {watch("dailyHours")?.toString().replace(".", ",")}h
          </Label>
          <input
            id="dailyHours"
            type="range"
            min={0.5}
            max={6}
            step={0.5}
            value={watch("dailyHours")}
            onChange={(e) => setValue("dailyHours", Number(e.target.value))}
            className="w-full accent-[#6d5dfc]"
            aria-label="Horas de estudo por dia"
          />
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Lembretes por notificação</p>
            <p className="text-xs text-muted-foreground">
              1 lembrete no seu horário + aviso de sequência em risco.
            </p>
          </div>
          <Switch
            checked={watch("notifyPush")}
            onCheckedChange={(v) => setValue("notifyPush", v)}
            aria-label="Lembretes por notificação"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Resumo semanal</p>
            <p className="text-xs text-muted-foreground">
              O que melhorou, o que piorou e a meta da próxima semana.
            </p>
          </div>
          <Switch
            checked={watch("weeklySummary")}
            onCheckedChange={(v) => setValue("weeklySummary", v)}
            aria-label="Resumo semanal"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Proteção de sobrecarga</p>
            <p className="text-xs text-muted-foreground">
              Se você estudar muito acima do plano, o StudyMoon sugere pausa.
            </p>
          </div>
          <Switch
            checked={watch("overloadGuard")}
            onCheckedChange={(v) => setValue("overloadGuard", v)}
            aria-label="Proteção de sobrecarga"
          />
        </div>
      </div>

      {status ? (
        <p className="text-sm" role="status">{status}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Recorde de sequência: {streakLongest} dias.
        </p>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-4 w-4" aria-hidden="true" />
        )}
        Salvar alterações
      </Button>
    </form>
  );
}

ProfileSettings.DeleteAccount = function DeleteAccount() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doDelete() {
    setDeleting(true);
    setError(null);
    const result = await deleteAccount();
    if (result.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    setError(result.error ?? "Erro ao apagar.");
    setDeleting(false);
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="mt-3"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Apagar definitivamente
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar sua conta?</DialogTitle>
            <DialogDescription>
              Isso remove permanentemente perfil, tentativas, redações,
              progresso e notificações. Digite{" "}
              <strong>APAGAR</strong> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="APAGAR"
            aria-label="Confirmação"
          />
          {error ? (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== "APAGAR" || deleting}
              onClick={() => void doDelete()}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
              Apagar minha conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
