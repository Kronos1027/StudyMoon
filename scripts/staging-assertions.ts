/** Strict checks used by hosted staging Auth/RLS smoke tests.
 * A failed network request, missing table, or invalid foreign key must NOT
 * be counted as proof that row-level security works.
 */
export interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
}

export function isAccessDenied(
  error: PostgrestLikeError | null | undefined,
  allowHiddenRpc = false,
): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  // PostgREST may hide functions without EXECUTE, so its schema lookup
  // reports PGRST202 rather than directly reporting permission denied.
  if (allowHiddenRpc && error.code === "PGRST202") return true;
  return /permission denied|row.level security|insufficient privilege|not permitted/i
    .test(error.message ?? "");
}
