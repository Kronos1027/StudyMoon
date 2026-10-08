"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Home, BookOpen, FileText, Trophy, User } from "lucide-react";
import { MoonLogo } from "@/components/brand/moon-logo";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/painel", label: "Painel", icon: Home },
  { href: "/estudo", label: "Estudar", icon: BookOpen },
  { href: "/redacao", label: "Redação", icon: FileText },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;

/** App shell for the authenticated area: side rail (desktop) + bottom nav (mobile). */
export function AppShell({
  children,
  apelido,
}: {
  children: ReactNode;
  apelido: string;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="min-h-screen md:pl-20">
      {/* Desktop side rail */}
      <aside
        className="fixed left-0 top-0 z-40 hidden h-full w-20 flex-col items-center gap-2 border-r border-border bg-card/60 py-5 backdrop-blur md:flex"
        aria-label="Navegação principal"
      >
        <Link href="/painel" aria-label="StudyMoon — painel">
          <MoonLogo className="h-9 w-9" />
        </Link>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex w-full flex-col items-center gap-1 rounded-xl px-2 py-3 text-[11px] transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                    active
                      ? "bg-primary/15 text-primary glow-1"
                      : "group-hover:bg-accent",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/painel" className="flex items-center gap-2" aria-label="StudyMoon — painel">
          <MoonLogo className="h-6 w-6" />
          <span className="font-semibold">
            Study<span className="text-gradient">Moon</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <main className="pb-24 md:pb-8">{children}</main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Navegação principal"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <span className="sr-only">Bem-vindo, {apelido}</span>
    </div>
  );
}
