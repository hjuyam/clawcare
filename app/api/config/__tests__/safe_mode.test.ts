import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as apply } from "../apply/route";
import { POST as rollback } from "../rollback/route";
import { loadManifest } from "../_utils";
import { disableSafeMode, enableSafeMode } from "@/tests/_helpers/safeMode";
import { authCookieHeader } from "@/tests/_helpers/auth";

describe("config apply/rollback (safe mode)", () => {
  beforeEach(async () => {
    await enableSafeMode("unit-test");
  });

  afterEach(async () => {
    await disableSafeMode();
  });

  it("rejects config apply when safe mode enabled", async () => {
    const manifest = await loadManifest();
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const req = new Request("http://localhost/api/config/apply", {
      method: "POST",
      headers,
      body: JSON.stringify({
        config: { featureFlag: true },
        base_version: manifest.currentVersion,
        author: "unit-test",
        reason: "safe mode test",
      }),
    });

    const res = await apply(req);
    const data = await res.json();

    expect([403, 409]).toContain(res.status);
    expect(data.error).toBeDefined();
    expect(typeof data.error.code).toBe("string");
    expect(typeof data.error.message).toBe("string");
    expect(typeof data.error.requestId).toBe("string");
  });

  it("rejects config rollback when safe mode enabled", async () => {
    const manifest = await loadManifest();
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const req = new Request("http://localhost/api/config/rollback", {
      method: "POST",
      headers,
      body: JSON.stringify({
        target_version: manifest.currentVersion,
        author: "unit-test",
        reason: "safe mode test",
      }),
    });

    const res = await rollback(req);
    const data = await res.json();

    expect([403, 409]).toContain(res.status);
    expect(data.error).toBeDefined();
    expect(typeof data.error.code).toBe("string");
    expect(typeof data.error.message).toBe("string");
    expect(typeof data.error.requestId).toBe("string");
  });
});
