import { expect, test } from "@playwright/test";
import { disableSafeMode, enableSafeMode } from "../_helpers/safeMode";
import { loginAsRole } from "../_helpers/auth";

test.describe("M4 memory center (contract)", () => {
  test.beforeEach(async () => {
    await disableSafeMode();
  });

  test("viewer can view memory list and search", async ({ page }) => {
    await loginAsRole(page, "viewer");

    await page.goto("/memory");
    await expect(page.getByRole("heading", { name: "Memory" })).toBeVisible();

    // List should load at least the fixtures file.
    await expect(page.getByText("fixtures.json")).toBeVisible();

    // Search should not error.
    const search = page.getByPlaceholder("搜索关键字");
    await search.fill("token");
    await search.press("Enter");

    // Results may be empty depending on fixtures, but page should remain usable.
    await expect(page.getByRole("heading", { name: "Memory" })).toBeVisible();
  });

  test("safe mode blocks memory delete", async ({ page }) => {
    await enableSafeMode("e2e");
    await loginAsRole(page, "admin");

    const res = await page.request.delete("/api/memory/fixtures.json", {
      data: { reason: "e2e", confirm: true },
    });

    expect([403, 409]).toContain(res.status());
    const data = await res.json();
    expect(data.error).toBeDefined();

    await disableSafeMode();
  });
});
