import { expect, test } from "@playwright/test";
import { disableSafeMode, enableSafeMode } from "../_helpers/safeMode";
import { loginAsRole } from "../_helpers/auth";

test.describe("M1 auth/RBAC/safe mode (contract)", () => {
  test.beforeEach(async () => {
    await disableSafeMode();
  });

  test("unauthenticated access is denied", async ({ page }) => {
    const res = await page.request.post("/api/ops/restart_gateway", {
      data: { reason: "e2e", confirm: true },
    });

    expect([401, 403]).toContain(res.status());
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(typeof data.error.code).toBe("string");
    expect(typeof data.error.message).toBe("string");
    expect(typeof data.error.requestId).toBe("string");
  });

  test("viewer cannot execute high-risk ops", async ({ page }) => {
    await loginAsRole(page, "viewer");

    const restart = await page.request.post("/api/ops/restart_gateway", {
      data: { reason: "e2e", confirm: true },
    });
    expect([403, 409]).toContain(restart.status());

    const current = await page.request.get("/api/config/current");
    const currentData = await current.json();

    const apply = await page.request.post("/api/config/apply", {
      data: {
        config: { featureFlag: true },
        base_version: currentData.current_version,
        author: "viewer",
        reason: "should be denied",
        confirm: true,
      },
    });
    expect([403, 409]).toContain(apply.status());

    const applyData = await apply.json();
    expect(applyData.error).toBeDefined();
  });

  test("admin can execute high-risk ops", async ({ page }) => {
    await loginAsRole(page, "admin");

    const restart = await page.request.post("/api/ops/restart_gateway", {
      data: { reason: "e2e", confirm: true },
    });
    expect(restart.status()).toBe(200);

    const current = await page.request.get("/api/config/current");
    const currentData = await current.json();

    const apply = await page.request.post("/api/config/apply", {
      data: {
        config: { featureFlag: true },
        base_version: currentData.current_version,
        author: "admin",
        reason: "apply config",
        confirm: true,
      },
    });
    expect(apply.status()).toBe(200);
    const applyData = await apply.json();
    expect(applyData.status).toBe("queued");
    expect(typeof applyData.run_id).toBe("string");
  });

  test("safe mode blocks admin high-risk ops", async ({ page }) => {
    await enableSafeMode("e2e");
    await loginAsRole(page, "admin");

    const res = await page.request.post("/api/ops/restart_gateway", {
      data: { reason: "e2e", confirm: true },
    });

    expect([403, 409]).toContain(res.status());
    const data = await res.json();
    expect(data.error).toBeDefined();

    await disableSafeMode();
  });
});
