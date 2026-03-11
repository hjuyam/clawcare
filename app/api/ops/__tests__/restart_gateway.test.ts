import { describe, expect, it } from "vitest";
import { POST } from "../restart_gateway/route";

describe("POST /api/ops/restart_gateway", () => {
  it("rejects without confirm", async () => {
    const req = new Request("http://localhost/api/ops/restart_gateway", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Testing restart" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error.code).toBe("CONFIRM_REQUIRED");
  });

  it("accepts confirmed restart", async () => {
    const req = new Request("http://localhost/api/ops/restart_gateway", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Testing restart", confirm: true }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("queued");
    expect(data.mode).toBe("mock");
  });
});
