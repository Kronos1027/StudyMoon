import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = [
  "/painel",
  "/teste-de-nivel",
  "/estudo",
  "/simulado",
  "/redacao",
  "/ranking",
  "/perfil",
  "/onboarding",
];

const AUTH_ROUTES = ["/login", "/cadastro", "/recuperar-senha"];

/**
 * Session proxy (Next.js 16 convention, replaces middleware.ts).
 * Refreshes the Supabase session cookie and guards protected routes.
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r);

  // Without Supabase configured, protected routes fall back to login,
  // which explains the pending setup (doc rule 2: fallback, don't break).
  if (!supabaseUrl || !anonKey) {
    if (isProtected) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("setup", "pendente");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/painel/:path*",
    "/estudo/:path*",
    "/simulado/:path*",
    "/redacao/:path*",
    "/ranking/:path*",
    "/perfil/:path*",
    "/onboarding/:path*",
    "/login",
    "/cadastro",
    "/recuperar-senha",
  ],
};
