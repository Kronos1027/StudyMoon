/**
 * StudyMoon deployment-safety gate for manual staging migrations, seeds and
 * Auth/RLS smoke tests. Runs BEFORE opening a connection or creating users.
 *
 * The current production Supabase ref is not a secret (it is part of the
 * public project URL). Explicitly deny it even if staging env vars are wrong.
 * This gate deliberately has no production override; production deployment
 * needs a separate reviewed process with backup and rollback.
 */
export const STUDYMOON_PRODUCTION_REF = "bxqliradehlbrmhqqafd";

export interface StagingGuardInput {
  mode?: string;
  stagingRef?: string;
  productionRef?: string;
  databaseUrl?: string;
  publicUrl?: string;
}

function requireStagingRef(input: StagingGuardInput): string {
  if (input.mode !== "staging") {
    throw new Error("Bloqueado: defina STUDYMOON_ENV=staging para homologação.");
  }
  const ref = input.stagingRef?.trim() ?? "";
  if (!/^[a-z0-9]{16,32}$/.test(ref)) {
    throw new Error("Bloqueado: STUDYMOON_STAGING_PROJECT_REF inválido ou ausente.");
  }
  if (ref === STUDYMOON_PRODUCTION_REF || ref === input.productionRef?.trim()) {
    throw new Error("Bloqueado: o projeto indicado é de PRODUÇÃO.");
  }
  return ref;
}

function parseTarget(value: string | undefined, label: string): URL {
  if (!value) throw new Error(`Bloqueado: ${label} não configurada.`);
  try { return new URL(value); }
  catch { throw new Error(`Bloqueado: ${label} inválida.`); }
}

export function assertSafeStagingAuthTarget(input: StagingGuardInput): string {
  const ref = requireStagingRef(input);
  const url = parseTarget(input.publicUrl, "NEXT_PUBLIC_SUPABASE_URL");
  if (url.protocol !== "https:" || url.hostname !== `${ref}.supabase.co`
      || url.username || url.password || url.port || url.pathname !== "/") {
    throw new Error("Bloqueado: URL Supabase Auth não pertence à homologação.");
  }
  return ref;
}

export function assertSafeStagingDatabaseTarget(input: StagingGuardInput): string {
  const ref = assertSafeStagingAuthTarget(input);
  const url = parseTarget(input.databaseUrl, "DATABASE_URL");
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("Bloqueado: DATABASE_URL não é uma URI PostgreSQL.");
  }

  // Supabase direct: db.<ref>.supabase.co
  // Supabase transaction/session pooler: postgres.<ref>@...pooler.supabase.com
  const isDirect = url.hostname === `db.${ref}.supabase.co`
    && url.username === "postgres";
  const isPooler = (url.hostname === "pooler.supabase.com"
      || url.hostname.endsWith(".pooler.supabase.com"))
    && decodeURIComponent(url.username) === `postgres.${ref}`;

  if (!isDirect && !isPooler) {
    throw new Error("Bloqueado: DATABASE_URL não corresponde ao projeto de homologação.");
  }
  return ref;
}

export function getStagingGuardInput(): StagingGuardInput {
  return {
    mode: process.env.STUDYMOON_ENV,
    stagingRef: process.env.STUDYMOON_STAGING_PROJECT_REF,
    productionRef: process.env.STUDYMOON_PRODUCTION_PROJECT_REF,
    databaseUrl: process.env.DATABASE_URL,
    publicUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  };
}
