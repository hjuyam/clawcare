import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "../route";
import { authCookieHeader } from "@/tests/_helpers/auth";

const gatewayBaseUrl = "http://gateway.test";

const sampleRun = {
  id: "gw-run-1",
  type: "ops.self_check",
  status: "queued",
  created_at: new Date().toISOString(),
};

describe("/api/runs (gateway mode)", () => {
  const originalBaseUrl = process.env.CLAWCARE_GATEWAY_BASE_URL;
  const originalToken = process.env.CLAWCARE_GATEWAY_AUTH_TOKEN;

  beforeEach(() => {
    process.env.CLAWCARE_GATEWAY_BASE_URL = gatewayBaseUrl;
    process.env.CLAWCARE_GATEWAY_AUTH_TOKEN = "Bearer gateway-token";
  });

  afterEach(() => {
    process.env.CLAWCARE_GATEWAY_BASE_URL = originalBaseUrl;
    process.env.CLAWCARE_GATEWAY_AUTH_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("lists runs via gateway", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ runs: [sampleRun] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );

    const headers = await authCookieHeader("viewer");
    const req = new Request("http://localhost/api/runs?limit=2", {
      method: "GET",
      headers,
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.runs[0].id).toBe(sampleRun.id);

    expect(fetchSpy).toHaveBeenCalled();
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(`${gatewayBaseUrl}/runs?limit=2`);
    expect(init?.method).toBe("GET");
  });

  it("creates run via gateway", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ run: sampleRun }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );

    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("viewer")),
    };

    const req = new Request("http://localhost/api/runs", {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "ops.self_check", reason: "e2e" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.run.id).toBe(sampleRun.id);
    expect(data.requestId).toBeTruthy();

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(`${gatewayBaseUrl}/runs`);
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toContain("ops.self_check");
  });

  it("propagates gateway failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "bad" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      })
    );

    const headers = await authCookieHeader("viewer");
    const req = new Request("http://localhost/api/runs", {
      method: "GET",
      headers,
    });

    const res = await GET(req);
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.error?.code).toBe("GATEWAY_RUNS_LIST_FAILED");
  });
});
