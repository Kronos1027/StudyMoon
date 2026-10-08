import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MoonLogo } from "@/components/brand/moon-logo";
import { Button } from "@/components/ui/button";

/**
 * Temporary Phase 0/1 landing page.
 * Phase 2 replaces this with the animated splash screen
 * (canvas starfield + pulsing moon).
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      <MoonLogo className="h-24 w-24" />
      <div className="space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">
          Study<span className="text-gradient">Moon</span>
        </h1>
        <p className="max-w-md text-balance text-muted-foreground">
          Preparação gratuita para o ENEM — do zero ao avançado, com um plano
          que se adapta a você.
        </p>
      </div>
      <Button asChild size="lg" className="rounded-full px-8">
        <Link href="/login">
          Entrar
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        Grátis para sempre. Sem anúncios.
      </p>
    </main>
  );
}
