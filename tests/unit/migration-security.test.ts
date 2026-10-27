import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = (name: string) =>
  readFileSync(join(process.cwd(), "supabase", "migrations", name), "utf8");

describe("StudyMoon migration security contracts", () => {
  it("allows only harmless simulator metadata to be added to question grants", () => {
    const sql = migration("0007_security_and_indexes.sql");
    const grant = sql.match(/grant\s+select\s*\(([^)]+)\)\s+on\s+public\.questions\s+to\s+authenticated\s*;/i);
    expect(grant).not.toBeNull();
    expect(grant?.[1].split(",").map((column) => column.trim())).toEqual([
      "subtopic",
      "demo_params",
    ]);
    // The original 0004 grants deliberately omit answer keys and numeric
    // checks. These columns must never be added as browser-accessible grants.
    expect(grant?.[1]).not.toMatch(/answer_key|explanation_md|numeric_expr|review_note/);
  });

  it("revokes public and signed-in direct execution on both privileged triggers", () => {
    const sql = migration("0007_security_and_indexes.sql");
    for (const func of ["handle_new_user", "handle_new_profile"]) {
      expect(sql).toContain(
        `revoke execute on function public.${func}() from public, anon, authenticated;`,
      );
      expect(sql).toContain(
        `alter function public.${func}() set search_path = '';`,
      );
    }
    expect(sql).toContain("alter function public.set_updated_at() set search_path = '';");
  });

  it("keeps 24 ownership policies scoped to a statement-initialized auth id", () => {
    const sql = migration("0008_optimize_rls.sql");
    const statements = sql.match(/alter policy [\s\S]*?;/g) ?? [];
    expect(statements).toHaveLength(24);
    for (const statement of statements) {
      expect(statement).toContain("(select auth.uid())");
      expect(statement).toMatch(/ on public\./);
    }
    // Writes must check both the old AND the replacement row.
    expect(sql).toMatch(/alter policy "profiles: update own"[^;]+ using \([\s\S]*?\) with check \(/);
    expect(sql).toMatch(/alter policy "essays: update own"[^;]+ using \([\s\S]*?\) with check \(/);
  });
});
