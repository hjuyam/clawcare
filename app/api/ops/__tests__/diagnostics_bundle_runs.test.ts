import { describe, expect, it } from "vitest";
import { POST } from "../diagnostics_bundle/route";
import { authCookieHeader } from "@/tests/_helpers/auth";

describe("POST /api/ops/diagnostics_bundle", () => {
  it("requires confirm", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const req = new Request("http://localhost/api/ops/diagnostics_bundle", {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: "diag" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("queues run when confirmed", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const req = new Request("http://localhost/api/ops/diagnostics_bundle", {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: "diag", confirm: true }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe("queued");
    expect(typeof data.run_id).toBe("string");
  });
});
