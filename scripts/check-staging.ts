/**
 * Read-only preflight: verifies that environment variables point to a separate
 * staging project before invoking any migration, seed or hosted Auth tests.
 * No network connections, writes, credentials or tokens are printed here.
 */
import { assertSafeStagingDatabaseTarget, getStagingGuardInput } from "./staging-guard";

try {
  const ref = assertSafeStagingDatabaseTarget(getStagingGuardInput());
  console.log(`StudyMoon staging target verified (${ref}). No database changes made.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid staging configuration");
  process.exitCode = 1;
}
