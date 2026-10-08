import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { OnboardingWizard } from "@/components/auth/onboarding-wizard";
import { getSupabaseServerClient } from "@/lib/db/server";

export const metadata: Metadata = { title: "Boas-vindas" };

export default async function OnboardingPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("apelido, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) redirect("/painel");

  return <OnboardingWizard initialApelido={profile?.apelido ?? "estudante"} />;
}
