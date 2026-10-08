import { MoonLogo } from "@/components/brand/moon-logo";

/**
 * Temporary Phase 0 landing page.
 * Phase 2 replaces this with the animated splash screen
 * (canvas starfield + pulsing moon + "Entrar" button).
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
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
      <p className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
        Construção em andamento · Fase 0 — Fundação
      </p>
    </main>
  );
}
