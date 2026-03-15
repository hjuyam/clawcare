import { expect, test } from "@playwright/test";
import { loginAsRole } from "../_helpers/auth";

test.describe("runs UI behaviors", () => {
  test("tasks list shows error banner on fetch failure", async ({ page }) => {
    await loginAsRole(page, "viewer");

    await page.route("**/api/runs?limit=50", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "boom" }),
      })
    );

    await page.goto("/tasks");
    await expect(page.getByText("HTTP 500")).toBeVisible();
  });

  test("run detail renders artifact path from result", async ({ page }) => {
    await loginAsRole(page, "viewer");

    const runId = "gw-run-99";
    await page.route(`**/api/runs/${runId}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          run: {
            id: runId,
            type: "ops.self_check",
            status: "succeeded",
            created_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
            ended_at: new Date().toISOString(),
            requested_by: { user_id: "e2e-viewer", role: "viewer" },
            reason: "artifact smoke",
            input: { payload: "demo" },
            result: {
              artifact_path: "/tmp/artifact.json",
              ok: true,
              links: ["https://github.com/hjuyam/clawcare"],
              summary: "Links: https://github.com/hjuyam/clawcare",
            },
            error: null,
          },
        }),
      })
    );

    await page.goto(`/tasks/${runId}`);

    await expect(page.getByTestId("run-detail-id")).toHaveText(runId);
    await expect(page.getByText("Artifact:")).toBeVisible();
    await expect(page.getByTestId("run-artifact-path")).toHaveText(
      "/tmp/artifact.json"
    );
    await expect(page.getByText("succeeded", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "https://github.com/hjuyam/clawcare" })).toBeVisible();
  });
});
