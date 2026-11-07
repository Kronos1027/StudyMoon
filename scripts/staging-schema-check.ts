/**
 * Inspect only: check which schema migrations are present before running
 * hosted authentication tests. Never use this to apply migrations.
 */
export interface MigrationReadiness {
  missing: string[];
  unexpected: string[];
}

export function compareMigrationHistory(
  expected: readonly string[],
  applied: readonly string[],
): MigrationReadiness {
  const expectSet = new Set(expected);
  const appliedSet = new Set(applied);
  return {
    missing: expected.filter((name) => !appliedSet.has(name)),
    unexpected: applied.filter((name) => !expectSet.has(name)),
  };
}

export function requireReadyMigrationHistory(
  expected: readonly string[],
  applied: readonly string[],
): void {
  const { missing, unexpected } = compareMigrationHistory(expected, applied);
  if (missing.length || unexpected.length) {
    throw new Error(
      `Staging schema not ready. Missing: ${missing.join(", ") || "none"}; ` +
      `unexpected: ${unexpected.join(", ") || "none"}.`,
    );
  }
}
