"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseUrl, getSupabaseAnonKey } from "./env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Browser-side Supabase client (anon key, RLS enforced).
 * Returns null when Supabase is not configured — callers show a clear
 * setup-pending state instead of crashing (doc rule: fallback, don't stop).
 */
export function getSupabaseBrowserClient() {
  if (!getSupabaseUrl() || !getSupabaseAnonKey()) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return browserClient;
}
