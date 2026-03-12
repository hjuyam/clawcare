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
    await page.getByRole("button", { name: "Apply (confirm=true)" }).click();

    await expect(page.getByText(/Apply queued \(run_id=/)).toBeVisible();
  });
});
