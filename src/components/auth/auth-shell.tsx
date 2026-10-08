import { MoonLogo } from "@/components/brand/moon-logo";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Shared centered card layout for auth screens. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  className,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-2">
        <MoonLogo className="h-14 w-14" />
        <span className="text-lg font-semibold tracking-tight">
          Study<span className="text-gradient">Moon</span>
        </span>
      </div>
      <section
        className={cn(
          "w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/10",
          className,
        )}
        aria-labelledby="auth-title"
      >
        <h1 id="auth-title" className="text-xl font-semibold">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
        <div className="mt-6">{children}</div>
      </section>
      {footer ? (
        <div className="text-sm text-muted-foreground">{footer}</div>
      ) : null}
    </main>
  );
}
