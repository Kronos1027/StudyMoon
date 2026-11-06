import { describe, expect, it } from "vitest";
import {
  STUDYMOON_PRODUCTION_REF,
  assertSafeStagingAuthTarget,
  assertSafeStagingDatabaseTarget,
  type StagingGuardInput,
} from "../../scripts/staging-guard";

const stagingRef = "stagingstudyproject01";
const authUrl = `https://${stagingRef}.supabase.co`;
const directDb = `postgresql://postgres:fake@db.${stagingRef}.supabase.co:5432/postgres`;
const poolerDb = `postgresql://postgres.${stagingRef}:fake@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

const safe: StagingGuardInput = {
  mode: "staging",
  stagingRef,
  productionRef: STUDYMOON_PRODUCTION_REF,
  publicUrl: authUrl,
  databaseUrl: directDb,
};

describe("staging-only safety guard", () => {
  it("permits the matching staging Auth endpoint and direct PostgreSQL", () => {
    expect(assertSafeStagingAuthTarget(safe)).toBe(stagingRef);
    expect(assertSafeStagingDatabaseTarget(safe)).toBe(stagingRef);
  });

  it("permits the matching Supabase pooler URI", () => {
    expect(assertSafeStagingDatabaseTarget({ ...safe, databaseUrl: poolerDb }))
      .toBe(stagingRef);
  });

  it("rejects missing staging mode and missing staging project", () => {
    expect(() => assertSafeStagingDatabaseTarget({ ...safe, mode: undefined }))
      .toThrow(/STUDYMOON_ENV/);
    expect(() => assertSafeStagingAuthTarget({ ...safe, stagingRef: undefined }))
      .toThrow(/STUDYMOON_STAGING_PROJECT_REF/);
  });

  it("always rejects the StudyMoon production reference, even if marked staging", () => {
    expect(() => assertSafeStagingAuthTarget({
      ...safe,
      stagingRef: STUDYMOON_PRODUCTION_REF,
      publicUrl: `https://${STUDYMOON_PRODUCTION_REF}.supabase.co`,
    })).toThrow(/PRODUÇÃO/);
  });

  it("rejects a separately declared production project reference", () => {
    expect(() => assertSafeStagingAuthTarget({
      ...safe,
      productionRef: stagingRef,
    })).toThrow(/PRODUÇÃO/);
  });

  it("rejects an Auth URL for another project before creating any users", () => {
    expect(() => assertSafeStagingAuthTarget({
      ...safe,
      publicUrl: `https://${STUDYMOON_PRODUCTION_REF}.supabase.co`,
    })).toThrow(/homologação/);
  });

  it("rejects a database pointing to production even when Auth is staging", () => {
    expect(() => assertSafeStagingDatabaseTarget({
      ...safe,
      databaseUrl: `postgresql://postgres:fake@db.${STUDYMOON_PRODUCTION_REF}.supabase.co:5432/postgres`,
    })).toThrow(/homologação/);
    expect(() => assertSafeStagingDatabaseTarget({
      ...safe,
      databaseUrl: `postgresql://postgres.${STUDYMOON_PRODUCTION_REF}:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    })).toThrow(/homologação/);
  });

  it("rejects non-Postgres protocols, local databases and unrecognized hosts", () => {
    for (const databaseUrl of [
      "https://example.com",
      "postgresql://postgres:fake@localhost:5432/postgres",
      "postgresql://postgres:fake@untrusted.example.com/postgres",
      "invalid-url",
    ]) {
      expect(() => assertSafeStagingDatabaseTarget({ ...safe, databaseUrl }))
        .toThrow(/Bloqueado/);
    }
  });

  it("rejects mismatched pooler usernames, insecure Auth and malformed refs", () => {
    expect(() => assertSafeStagingDatabaseTarget({
      ...safe, databaseUrl: "postgresql://postgres.otherproject01:fake@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    })).toThrow(/homologação/);
    expect(() => assertSafeStagingAuthTarget({
      ...safe, publicUrl: `http://${stagingRef}.supabase.co`,
    })).toThrow(/homologação/);
    expect(() => assertSafeStagingAuthTarget({
      ...safe, stagingRef: "../../production",
    })).toThrow(/STUDYMOON_STAGING_PROJECT_REF/);
  });
});
