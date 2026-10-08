import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MoonLogo } from "@/components/brand/moon-logo";
import { StarfieldCanvas } from "@/components/brand/starfield-canvas";
import { Button } from "@/components/ui/button";
import { getSupabaseServerClient } from "@/lib/db/server";
import { redirect } from "next/navigation";

export default async function SplashPage() {
  // Signed-in users go straight to their panel.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/painel");
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <StarfieldCanvas className="absolute inset-0 h-full w-full" />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 38%, rgba(109,93,252,0.16), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
        <MoonLogo className="h-28 w-28" />
        <div className="space-y-3">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
            Study<span className="text-gradient">Moon</span>
          </h1>
          <p className="mx-auto max-w-md text-balance text-lg text-muted-foreground">
            Preparação gratuita para o ENEM — do zero ao avançado, com um plano
            que se adapta a você.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button asChild size="lg" className="h-12 rounded-full px-10 text-base glow-1">
            <Link href="/login">
              Entrar
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Grátis para sempre · sem anúncios ·{" "}
            <Link href="/cadastro" className="text-accent-2-ink hover:underline">
              criar conta
            </Link>
          </p>
        </div>

        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <li>Aulas interativas</li>
          <li aria-hidden="true">·</li>
          <li>Prática adaptativa</li>
          <li aria-hidden="true">·</li>
          <li>Revisão inteligente</li>
          <li aria-hidden="true">·</li>
          <li>Simulados e redação</li>
        </ul>
      </div>
    </main>
  );
}
