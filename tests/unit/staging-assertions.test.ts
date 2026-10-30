import { describe, expect, it } from "vitest";
import { isAccessDenied } from "../../scripts/staging-assertions";

describe("hosted RLS assertions fail closed", () => {
  it("accepts PostgreSQL permission errors", () => {
    expect(isAccessDenied({ code: "42501", message: "permission denied" })).toBe(true);
    expect(isAccessDenied({ code: "42501", message: "new row violates row-level security policy" })).toBe(true);
  });

  it("accepts hidden PostgREST RPCs only when testing RPC exposure", () => {
    expect(isAccessDenied({ code: "PGRST202", message: "Could not find the function" }, true)).toBe(true);
    expect(isAccessDenied({ code: "PGRST202", message: "Could not find the function" })).toBe(false);
  });

  it("does not treat network/schema/database failures as RLS success", () => {
    for (const error of [
      null,
      { code: "23503", message: "foreign key violation" },
      { code: "23502", message: "null value violates not-null constraint" },
      { code: "42P01", message: "relation does not exist" },
      { code: "PGRST116", message: "JSON object requested, multiple rows returned" },
      { code: "PGRST301", message: "JWT expired" },
      { code: "08006", message: "connection failure" },
    ]) {
      expect(isAccessDenied(error, true)).toBe(false);
    }
  });

  it("accepts recognizable RLS denials without an error code", () => {
    expect(isAccessDenied({ message: "new row violates row-level security policy" })).toBe(true);
    expect(isAccessDenied({ message: "insufficient privilege for table" })).toBe(true);
  });
});
