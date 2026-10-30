import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("hosted staging Auth workflow is opt-in only", () => {
  const workflow = readFileSync(
    join(process.cwd(), ".github/workflows/staging-auth-rls.yml"), "utf8",
  );

  it("does not run on ordinary pushes or PR synchronization", () => {
    expect(workflow).not.toMatch(/^\s+push:/m);
    expect(workflow).not.toMatch(/types:\s*\[(?:[^\]]*synchronize|[^\]]*opened)[^\]]*\]/);
    expect(workflow).toMatch(/pull_request:\s*\n\s+types:\s*\[labeled\]/);
  });

  it("requires an explicit reviewer-controlled label for pre-merge runs", () => {
    expect(workflow).toContain("github.event.label.name == 'verify-supabase-staging'");
    expect(workflow).toContain("github.event.action == 'labeled'");
    expect(workflow).toContain("environment: staging");
  });

  it("requires preflight and read-only schema check before creating Auth users", () => {
    const preflight = workflow.indexOf("pnpm staging:check");
    const schema = workflow.indexOf("pnpm staging:schema-check");
    const hosted = workflow.indexOf("pnpm db:test-rls");
    expect(preflight).toBeGreaterThan(-1);
    expect(schema).toBeGreaterThan(preflight);
    expect(hosted).toBeGreaterThan(schema);
    expect(workflow).not.toContain("pnpm db:migrate");
    expect(workflow).not.toContain("pnpm db:seed");
  });
});
