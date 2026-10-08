import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseUrl,
  getSupabaseSecretKey,
  isSupabaseAdminConfigured,
} from "./env";

/**
 * Admin client using the SECRET key — bypasses RLS.
 * SERVER-ONLY (enforced by the "server-only" import). Used by server
 * actions and cron routes to write system-of-record tables.
 * Returns null when not configured.
 */
export function getSupabaseAdmin() {
  if (!isSupabaseAdminConfigured()) return null;
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
