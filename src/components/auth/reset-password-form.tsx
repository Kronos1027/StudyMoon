"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Loader2, KeyRound } from "lucide-react";
import type { UserResponse } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthShell } from "@/components/auth/auth-shell";
import { getSupabaseBrowserClient } from "@/lib/db/client";
import { mapAuthError, validatePassword } from "@/lib/auth/errors";

const schema = z
  .object({
    password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const [authError, setAuthError] = useState<string | null>(null);
  // Not configured → never in the exchanging state to begin with.
  const [exchanging, setExchanging] = useState(Boolean(supabase));

  useEffect(() => {
    const code = searchParams.get("code");
    if (!supabase || !code) {
      supabase?.auth
        .getUser()
        .then((res: UserResponse) => {
          if (!res.data.user) {
            setAuthError("O link é inválido ou expirou. Solicite um novo.");
          }
        })
        .catch(() => setAuthError("O link é inválido ou expirou. Solicite um novo."))
        .finally(() => setExchanging(false));
      return;
    }
    supabase.auth
      .exchangeCodeForSession(code)
      .catch(() => {
        setAuthError("O link é inválido ou expirou. Solicite um novo.");
      })
      .finally(() => setExchanging(false));
  }, [searchParams, supabase]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(schema), mode: "onBlur" });

  async function onSubmit(values: ResetForm) {
    setAuthError(null);
    if (!supabase) return;
    const pwError = validatePassword(values.password);
    if (pwError) {
      setAuthError(pwError);
      return;
    }
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });
    if (error) {
      setAuthError(mapAuthError(error.code, error.message));
      return;
    }
    router.replace("/painel");
    router.refresh();
  }

  return (
    <AuthShell
      title="Nova senha"
      subtitle="Escolha uma senha forte e fácil de lembrar para você."
      footer={
        <Link href="/recuperar-senha" className="hover:text-foreground">
          Pedir outro link
        </Link>
      }
    >
      {exchanging ? (
        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Verificando link...
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.password.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Pelo menos 8 caracteres, com letra e número.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.confirmPassword.message}
              </p>
            ) : null}
          </div>

          {authError ? (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            )}
            Salvar nova senha
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
