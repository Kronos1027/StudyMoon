import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { getEnabledAuthProviders } from "@/lib/auth/providers";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage() {
  // Only render OAuth buttons for providers enabled on the GoTrue server
  // (Supabase → Authentication → Providers). Hidden until configured.
  const providers = await getEnabledAuthProviders();

  return (
    <Suspense>
      <LoginForm googleEnabled={providers.google} />
    </Suspense>
  );
}
