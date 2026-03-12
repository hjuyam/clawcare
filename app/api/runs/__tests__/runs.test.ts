import { describe, expect, it } from "vitest";
import { GET, POST } from "../route";
import { authCookieHeader } from "@/tests/_helpers/auth";

describe("/api/runs", () => {
  it("allows viewer to list runs", async () => {
    const headers = {
      ...(await authCookieHeader("viewer")),
    };

    const req = new Request("http://localhost/api/runs?limit=5", {
      method: "GET",
      headers,
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.runs)).toBe(true);
  });

  it("creates a low-risk run as viewer", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("viewer")),
    };

    const req = new Request("http://localhost/api/runs", {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "ops.self_check", reason: "test run" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.run.type).toBe("ops.self_check");
    expect(data.run.status).toBe("queued");
  });

  it("rejects high-risk run creation for viewer", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("viewer")),
    };

    const req = new Request("http://localhost/api/runs", {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "ops.cleanup", reason: "try" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
