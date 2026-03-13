import { expect, test } from "@playwright/test";

test.describe("M3 config center (contract-lite)", () => {
  test("viewer can preview diff", async ({ page }) => {
    const { loginAsRole } = await import("../_helpers/auth");
    await loginAsRole(page, "viewer");

    await page.goto("/config");

    await expect(page.getByRole("heading", { name: "Config" })).toBeVisible();

    await page.getByRole("button", { name: "Preview diff" }).click();
    await expect(page.getByText("Preview generated.")).toBeVisible();

    await expect(page.getByText("Preview (masked)")).toBeVisible();
  });

  test("admin can queue apply", async ({ page }) => {
    const { loginAsRole } = await import("../_helpers/auth");
    await loginAsRole(page, "admin");

    await page.goto("/config");

    await page.getByPlaceholder("Why are you changing config?").fill("e2e apply");

    // Capture current version, then apply and assert the manifest/version actually moved.
    const before = await page.getByText(/version: v\d+/).textContent();
    await page.getByRole("button", { name: "Apply (confirm=true)" }).click();

    await expect
      .poll(async () => {
        const now = await page.getByText(/version: v\d+/).textContent();
        return { before: before?.trim() ?? "", now: now?.trim() ?? "" };
      })
      .not.toEqual({ before: before?.trim() ?? "", now: before?.trim() ?? "" });

    // And the latest entry should show our reason (best-effort contract).
    await expect(page.getByText(/← current/)).toBeVisible();
    await expect(page.getByText(/e2e apply/).first()).toBeVisible();
  });
});
