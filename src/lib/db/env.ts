/**
 * Central environment access for Supabase clients.
 * NEXT_PUBLIC_ prefix exposes URL/anon key to the browser bundle.
 */
export function getSupabaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  return url.replace(/\/$/, "");
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    ""
  );
}

export function getSupabaseSecretKey(): string {
  return process.env.SUPABASE_SECRET_KEY ?? "";
}

/** True when the app is fully wired to a Supabase project. */
export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

/** True when server-only admin operations are possible. */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseSecretKey());
}
