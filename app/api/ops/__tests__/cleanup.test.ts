import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "../cleanup/route";
import { disableSafeMode, enableSafeMode } from "@/tests/_helpers/safeMode";
import { authCookieHeader } from "@/tests/_helpers/auth";

describe("POST /api/ops/cleanup", () => {
  it("defaults to dry-run preview", async () => {
    const auth = await authCookieHeader("operator");
    const req = new Request("http://localhost/api/ops/cleanup", {
      method: "POST",
      headers: { "content-type": "application/json", ...auth },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("preview");
    expect(data.dry_run).toBe(true);
  });

  it("executes when confirm is true", async () => {
    const auth = await authCookieHeader("operator");
    const req = new Request("http://localhost/api/ops/cleanup", {
      method: "POST",
      headers: { "content-type": "application/json", ...auth },
      body: JSON.stringify({ confirm: true }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("executed");
    expect(data.dry_run).toBe(false);
  });

  describe("safe mode", () => {
    beforeEach(async () => {
      await enableSafeMode("unit-test");
    });

    afterEach(async () => {
      await disableSafeMode();
    });

    it("rejects confirmed cleanup when safe mode enabled", async () => {
      const auth = await authCookieHeader("operator");
      const req = new Request("http://localhost/api/ops/cleanup", {
        method: "POST",
        headers: { "content-type": "application/json", ...auth },
        body: JSON.stringify({ confirm: true }),
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
