import { MoonLogo } from "@/components/brand/moon-logo";

export const metadata = { title: "Sem conexão" };

/**
 * Offline fallback page served by the service worker (public/sw.js).
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <MoonLogo className="h-20 w-20" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Você está offline</h1>
        <p className="max-w-sm text-balance text-muted-foreground">
          A lua continua no céu, mas o StudyMoon precisa de internet para
          sincronizar seu progresso. Reconecte-se para continuar estudando.
        </p>
      </div>
    </main>
  );
}
