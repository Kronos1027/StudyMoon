"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthShell } from "@/components/auth/auth-shell";
import { getSupabaseBrowserClient } from "@/lib/db/client";
import { mapAuthError } from "@/lib/auth/errors";

const schema = z.object({
  email: z.string().email("Digite um e-mail válido"),
});

type ForgotForm = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const supabase = getSupabaseBrowserClient();
  const [authError, setAuthError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({ resolver: zodResolver(schema), mode: "onBlur" });

  async function onSubmit(values: ForgotForm) {
    setAuthError(null);
    if (!supabase) return;
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) {
      setAuthError(mapAuthError(error.code, error.message));
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviamos um link para você criar uma nova senha."
      footer={
        <Link href="/login" className="hover:text-foreground">
          Voltar para o login
        </Link>
      }
    >
      {sent ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Se existir uma conta com este e-mail, você receberá o link em
            instantes. Ele vale por 1 hora.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail da sua conta</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.email.message}
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
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            Enviar link de recuperação
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
