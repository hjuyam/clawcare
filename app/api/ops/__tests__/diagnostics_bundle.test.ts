import { describe, expect, it } from "vitest";
import { GET } from "../diagnostics_bundle/route";
import { authCookieHeader } from "@/tests/_helpers/auth";

describe("GET /api/ops/diagnostics_bundle", () => {
  it("returns sanitized diagnostics", async () => {
    const headers = {
      ...(await authCookieHeader("viewer")),
    };
    const req = new Request("http://localhost/api/ops/diagnostics_bundle", {
      method: "GET",
      headers,
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe("mock");
    expect(data.redactions.user).toBe("[redacted]");
  });
});
