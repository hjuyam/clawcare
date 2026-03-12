import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "../restart_gateway/route";
import { disableSafeMode, enableSafeMode } from "@/tests/_helpers/safeMode";
import { authCookieHeader } from "@/tests/_helpers/auth";

describe("POST /api/ops/restart_gateway", () => {
  beforeEach(async () => {
    // Ensure isolation: other test files may toggle Safe Mode and persist it.
    await disableSafeMode();
  });

  it("rejects without confirm", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const req = new Request("http://localhost/api/ops/restart_gateway", {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: "Testing restart" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error.code).toBe("CONFIRM_REQUIRED");
  });

  it("accepts confirmed restart", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const req = new Request("http://localhost/api/ops/restart_gateway", {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: "Testing restart", confirm: true }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("queued");
    expect(data.mode).toBe("mock");
  });

  describe("safe mode", () => {
    beforeEach(async () => {
      await enableSafeMode("unit-test");
    });

    afterEach(async () => {
      await disableSafeMode();
    });

    it("rejects confirmed restart when safe mode enabled", async () => {
      const headers = {
        "content-type": "application/json",
        ...(await authCookieHeader("admin")),
      };

      const req = new Request("http://localhost/api/ops/restart_gateway", {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: "Testing restart", confirm: true }),
      });

      const res = await POST(req);
      const data = await res.json();

      expect([403, 409]).toContain(res.status);
      expect(data.error).toBeDefined();
      expect(typeof data.error.code).toBe("string");
      expect(typeof data.error.message).toBe("string");
      expect(typeof data.error.requestId).toBe("string");
    });
  });
});
