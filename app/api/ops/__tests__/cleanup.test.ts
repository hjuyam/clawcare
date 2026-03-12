import { describe, expect, it } from "vitest";
import { POST } from "../cleanup/route";

describe("POST /api/ops/cleanup", () => {
  it("defaults to dry-run preview", async () => {
    const req = new Request("http://localhost/api/ops/cleanup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("preview");
    expect(data.dry_run).toBe(true);
  });

  it("executes when confirm is true", async () => {
    const req = new Request("http://localhost/api/ops/cleanup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: true }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("executed");
    expect(data.dry_run).toBe(false);
  });
});
