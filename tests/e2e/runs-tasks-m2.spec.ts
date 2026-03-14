import { expect, test } from "@playwright/test";
import { loginAsRole } from "../_helpers/auth";

test.describe("M2 runs/tasks flow", () => {
  test("create run from ops, see in tasks, open detail, audit visible", async ({ page }) => {
    await loginAsRole(page, "viewer");

    await page.goto("/ops");

    await page.getByTestId("create-run-type").selectOption("ops.self_check");
    await page.getByTestId("create-run-reason").fill("e2e run");

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().endsWith("/api/runs") && res.request().method() === "POST",
      ),
      page.getByTestId("create-run-submit").click(),
    ]);

    const payload = await response.json();
    expect(payload?.run?.id).toBeTruthy();
    const runId = payload.run.id as string;

    await page.goto("/tasks");

    const row = page.locator(
      `[data-testid="run-row"][data-run-id="${runId}"]`,
    );
    await expect(row).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/tasks\//),
      row.locator(`a[data-testid="run-link-${runId}"]`).click(),
    ]);
    await expect(page.getByTestId("run-detail-id")).toHaveText(runId);

    await page.goto(`/security?action=runs.create`);
    const auditRow = page.locator(
      `[data-testid="audit-row"][data-action="runs.create"][data-resource-id="${runId}"]`,
    );
    await expect(auditRow).toBeVisible();
  });
});
