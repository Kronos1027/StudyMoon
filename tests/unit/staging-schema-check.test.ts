import { describe, expect, it } from "vitest";
import {
  compareMigrationHistory,
  requireReadyMigrationHistory,
} from "../../scripts/staging-schema-check";

describe("read-only staging schema readiness", () => {
  const expected = [
    "0001_schema.sql",
    "0002_functions_triggers.sql",
    "0018_srs_retry_backoff.sql",
  ];

  it("accepts exact matching history independent of row ordering", () => {
    const applied = [expected[2], expected[0], expected[1]];
    expect(compareMigrationHistory(expected, applied)).toEqual({
      missing: [], unexpected: [],
    });
    expect(() => requireReadyMigrationHistory(expected, applied)).not.toThrow();
  });

  it("blocks missing migrations before hosted Auth test accounts are created", () => {
    const applied = [expected[0], expected[1]];
    expect(compareMigrationHistory(expected, applied)).toEqual({
      missing: ["0018_srs_retry_backoff.sql"],
      unexpected: [],
    });
    expect(() => requireReadyMigrationHistory(expected, applied))
      .toThrow(/0018_srs_retry_backoff.sql/);
  });

  it("blocks unknown migrations that may indicate the wrong project/schema", () => {
    const applied = [...expected, "custom_prod_schema.sql"];
    expect(compareMigrationHistory(expected, applied)).toEqual({
      missing: [],
      unexpected: ["custom_prod_schema.sql"],
    });
    expect(() => requireReadyMigrationHistory(expected, applied))
      .toThrow(/custom_prod_schema.sql/);
  });

  it("rejects mixed missing/extra history", () => {
    expect(() => requireReadyMigrationHistory(expected, [
      "0001_schema.sql", "unexpected.sql",
    ])).toThrow(/Staging schema not ready/);
  });
});
