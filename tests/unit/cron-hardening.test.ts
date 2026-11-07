import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

describe("scheduled job security and error handling", () => {
  it.each([
    "src/app/api/cron/content/route.ts",
    "src/app/api/cron/keepalive/route.ts",
    "src/app/api/cron/reminders/route.ts",
    "src/app/api/cron/reconcile-srs/route.ts",
  ])("%s authenticates only with an exact Bearer header", (file) => {
    const source = read(file);
    expect(source).toContain('request.headers.get("authorization")');
    expect(source).toContain("Bearer ");
    expect(source).not.toContain('searchParams.get("secret")');
    expect(source).toContain("401");
  });

  it("nightly generation does not hide a failed HTTP request", () => {
    const workflow = read(".github/workflows/content-nightly.yml");
    expect(workflow).toContain("--fail-with-body");
    expect(workflow).toContain('grep -q');
    expect(workflow).not.toContain("|| true");
    const route = read("src/app/api/cron/content/route.ts");
    expect(route).toContain("hasErrors");
    expect(route).toContain("503");
  });

  it("keepalive checks non-2xx HTTP status", () => {
    const workflow = read(".github/workflows/keepalive.yml");
    expect(workflow).toContain("--fail-with-body");
    expect(workflow).not.toContain("|| true");
  });
});
