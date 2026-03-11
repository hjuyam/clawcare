import { describe, expect, it } from "vitest";
import { GET } from "../diagnostics_bundle/route";

describe("GET /api/ops/diagnostics_bundle", () => {
  it("returns sanitized diagnostics", async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe("mock");
    expect(data.redactions.user).toBe("[redacted]");
  });
});
