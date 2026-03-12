import { describe, expect, it } from "vitest";
import { POST } from "../self_check/route";
import { authCookieHeader } from "@/tests/_helpers/auth";

describe("POST /api/ops/self_check", () => {
  it("returns mock self check summary", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("viewer")),
    };

    const req = new Request("http://localhost/api/ops/self_check", {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.summary).toEqual({ ok: 1, warnings: 1, errors: 1 });
    expect(data.mode).toBe("mock");
  });
});
