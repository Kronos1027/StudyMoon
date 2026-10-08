"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthShell } from "@/components/auth/auth-shell";
import { getSupabaseBrowserClient } from "@/lib/db/client";
import { mapAuthError, validatePassword } from "@/lib/auth/errors";

const signupSchema = z
  .object({
    apelido: z
      .string()
      .min(2, "O apelido precisa de pelo menos 2 caracteres")
      .max(24, "O apelido tem no máximo 24 caracteres"),
    email: z.string().email("Digite um e-mail válido"),
    password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres"),
    confirmPassword: z.string(),
    birthDate: z
      .string()
      .min(1, "Informe sua data de nascimento (necessário pela LGPD)"),
    consent: z.literal(true, {
      error: "Você precisa aceitar os termos para criar a conta",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

function isMinor(birthDate: string): boolean {
  const birth = new Date(birthDate + "T00:00:00");
  const age = (Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000);
  return age < 18;
}

export function SignupForm() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [authError, setAuthError] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState<string | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
  });

  const birthDate = watch("birthDate");
  const showMinorNotice = birthDate && isMinor(birthDate);

  async function onSubmit(values: SignupForm) {
    setAuthError(null);
    setNeedsEmailConfirm(null);
    if (!supabase) {
      setAuthError(
        "O StudyMoon ainda não está conectado ao banco de dados. Veja docs/SETUP.md.",
      );
      return;
    }
    const passwordError = validatePassword(values.password);
    if (passwordError) {
      setAuthError(passwordError);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          apelido: values.apelido,
          birth_date: values.birthDate,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setAuthError(mapAuthError(error.code, error.message));
      return;
    }

    if (data.session) {
      router.replace("/onboarding");
      router.refresh();
      return;
    }
    setNeedsEmailConfirm(values.email);
  }

  if (needsEmailConfirm) {
    return (
      <AuthShell title="Quase lá!" subtitle="Confirme seu e-mail">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="space-y-3">
            <p>
              Enviamos um link de confirmação para{" "}
              <strong>{needsEmailConfirm}</strong>. Depois de confirmar, entre
              com seu e-mail e senha.
            </p>
            <p className="text-muted-foreground">
              Não chegou? Verifique o spam ou{" "}
              <Link href="/cadastro" className="text-accent-1-ink hover:underline">
                tente novamente
              </Link>
              .
            </p>
          </AlertDescription>
        </Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Criar conta grátis"
      subtitle="Leva menos de um minuto. E é grátis para sempre."
      footer={
        <p>
          Já tem conta?{" "}
          <Link href="/login" className="text-accent-1-ink hover:underline">
            Entrar
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="apelido">Apelido</Label>
          <Input
            id="apelido"
            placeholder="Como quer ser chamado"
            autoComplete="nickname"
            maxLength={24}
            aria-invalid={!!errors.apelido}
            {...register("apelido")}
          />
          {errors.apelido ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.apelido.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Aparece no ranking. Nunca mostramos seu e-mail.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
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
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthDate">Data de nascimento</Label>
          <Input
            id="birthDate"
            type="date"
            max={new Date().toISOString().split("T")[0]}
            aria-invalid={!!errors.birthDate}
            {...register("birthDate")}
          />
          {errors.birthDate ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.birthDate.message}
            </p>
          ) : null}
        </div>

        {showMinorNotice ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Você tem menos de 18 anos: seu perfil fica privado por padrão e o
              ranking mostra apenas o seu apelido. Pedimos que um responsável
              leia nossos termos junto com você.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-start gap-2">
          <input
            id="consent"
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input accent-[#6d5dfc]"
            aria-invalid={!!errors.consent}
            {...register("consent")}
          />
          <Label htmlFor="consent" className="text-sm font-normal leading-relaxed">
            Li e aceito os{" "}
            <Link href="/termos" className="text-accent-1-ink hover:underline">
              termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className="text-accent-1-ink hover:underline">
              política de privacidade
            </Link>
            . Sei que o conteúdo gerado por IA pode conter erros.
          </Label>
        </div>
        {errors.consent ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.consent.message}
          </p>
        ) : null}

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
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          {isSubmitting ? "Criando conta..." : "Criar conta grátis"}
        </Button>
      </form>
    </AuthShell>
  );
}
