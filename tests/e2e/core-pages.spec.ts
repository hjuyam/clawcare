import { expect, test } from "@playwright/test";

test.describe("core pages (mock gateway)", () => {
  test("home shows capabilities", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Capabilities", { exact: true })).toBeVisible();
    await expect(page.getByText("GET /api/capabilities")).toBeVisible();
    await expect(page.getByText("ok", { exact: true })).toBeVisible();

    await expect(page.getByText("Placeholder capabilities")).toBeVisible();
  });

  test("ops self_check (mock)", async ({ page }) => {
    await page.goto("/ops");
    await expect(page.getByText("self_check")).toBeVisible();

    // ops/self_check requires viewer+; use a real session cookie.
    const { loginAsRole } = await import("../_helpers/auth");
    await loginAsRole(page, "viewer");

    const res = await page.request.post("/api/ops/self_check", { data: {} });
    expect(res.ok()).toBeTruthy();

    const json = await res.json();
    expect(json).toMatchObject({
      mode: "mock",
    });
    expect(json.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "gateway.connectivity" }),
      ])
    );
  });

  test("config placeholder", async ({ page }) => {
    await page.goto("/config");

    await expect(
      page.getByText(
        "占位：Basic Settings + Config Center（只读→启用编辑→diff→apply→rollback）。"
      )
    ).toBeVisible();
  });

  test("security audit placeholder", async ({ page }) => {
    await page.goto("/security");

    await expect(
      page.getByText("审计日志：login/config_change/tool_call/external_send")
    ).toBeVisible();
  });
});
