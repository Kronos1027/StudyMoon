import { cache } from "react";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/db/env";

/**
 * Which OAuth providers the GoTrue server actually has enabled.
 *
 * The auth UI only renders buttons for enabled providers (honest
 * degradation): clicking "Entrar com Google" while the provider is off
 * in Supabase fails with "Unsupported provider: provider is not enabled".
 * `GET /auth/v1/settings` is a public endpoint (needs only the apikey)
 * and returns the full provider matrix — we check it at render time.
 *
 * Cached per-request (React cache) and for 5 minutes in the Next data
 * cache: settings rarely change, and after enabling Google in the
 * dashboard the button appears on its own within minutes.
 *
 * Any failure (network, non-OK, unexpected shape) hides the buttons —
 * a missing button is honest, a broken one is not.
 */
export const getEnabledAuthProviders = cache(
  async (): Promise<{ google: boolean }> => {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    if (!url || !key) return { google: false };

    try {
      const res = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: key },
        next: { revalidate: 300 },
      });
      if (!res.ok) return { google: false };

      const data = (await res.json()) as {
        external?: { google?: boolean };
      };
      return { google: data.external?.google === true };
    } catch {
      return { google: false };
    }
  },
);
