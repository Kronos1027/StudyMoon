import { expect, test } from "@playwright/test";

/**
 * Phase 0 smoke: app renders, branding present, no console errors.
 */
test("home renders the StudyMoon brand", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /StudyMoon/i })).toBeVisible();
  await expect(page.getByText("Preparação gratuita para o ENEM")).toBeVisible();

  expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
});

test("PWA manifest is served", async ({ request }) => {
  const res = await request.get("/manifest.json");
  expect(res.ok()).toBeTruthy();
  const manifest = await res.json();
  expect(manifest.name).toContain("StudyMoon");
  expect(manifest.icons.length).toBeGreaterThan(0);
});
