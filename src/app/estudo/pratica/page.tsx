import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { PracticeSession } from "@/components/practice/practice-session";
import { getSupabaseServerClient } from "@/lib/db/server";

export const metadata: Metadata = { title: "Prática" };
export const dynamic = "force-dynamic";

export default async function PraticaPage({
  searchParams,
}: {
  searchParams: Promise<{ topico?: string; modo?: string }>;
}) {
  const { topico, modo } = await searchParams;
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
  if (!profile?.onboarding_completed) redirect("/onboarding");

  const isTest = modo === "teste";

  return (
    <AppShell apelido={profile.apelido}>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Preparando questões...
            </div>
          }
        >
          <PracticeSession
            topicSlug={topico ?? null}
            mode={isTest ? "lesson_test" : "practice"}
            testLength={isTest ? 5 : null}
          />
        </Suspense>
      </div>
    </AppShell>
  );
}
