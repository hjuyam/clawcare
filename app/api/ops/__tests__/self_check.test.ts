import { describe, expect, it } from "vitest";
import { POST } from "../self_check/route";

describe("POST /api/ops/self_check", () => {
  it("returns mock self check summary", async () => {
    const req = new Request("http://localhost/api/ops/self_check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary).toEqual({ ok: 1, warnings: 1, errors: 1 });
    expect(data.mode).toBe("mock");
  });
});
