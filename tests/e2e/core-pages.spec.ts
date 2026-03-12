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
    await expect(page.getByRole("heading", { name: "Ops" })).toBeVisible();

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

  test("config page renders", async ({ page }) => {
    await page.goto("/config");

    await expect(page.getByRole("heading", { name: "Config" })).toBeVisible();
    await expect(page.getByText("运行历史")).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: "Tasks & Runs" })
    ).toBeVisible();
  });

  test("tasks page placeholder", async ({ page }) => {
    await page.goto("/tasks");

    await expect(page.getByRole("heading", { name: "Tasks & Runs" })).toBeVisible();
    await expect(page.getByText("最近运行（最多 50 条）")).toBeVisible();
  });

  test("security audit placeholder", async ({ page }) => {
    await page.goto("/security");

    await expect(
      page.getByText("审计日志：login/config_change/tool_call/external_send")
    ).toBeVisible();
  });
});
