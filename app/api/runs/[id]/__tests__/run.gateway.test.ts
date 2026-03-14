import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";
import { authCookieHeader } from "@/tests/_helpers/auth";

const gatewayBaseUrl = "http://gateway.test";

const sampleRun = {
  run: {
    id: "gw-run-42",
    type: "ops.self_check",
    status: "succeeded",
    created_at: new Date().toISOString(),
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
  },
};

describe("/api/runs/:id (gateway mode)", () => {
  const originalBaseUrl = process.env.CLAWCARE_GATEWAY_BASE_URL;
  const originalToken = process.env.CLAWCARE_GATEWAY_AUTH_TOKEN;

  beforeEach(() => {
    process.env.CLAWCARE_GATEWAY_BASE_URL = gatewayBaseUrl;
    process.env.CLAWCARE_GATEWAY_AUTH_TOKEN = "gateway-token";
  });

  afterEach(() => {
    process.env.CLAWCARE_GATEWAY_BASE_URL = originalBaseUrl;
    process.env.CLAWCARE_GATEWAY_AUTH_TOKEN = originalToken;
    vi.restoreAllMocks();
  });

  it("fetches run detail via gateway", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(sampleRun), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      );

    const headers = await authCookieHeader("viewer");
    const req = new Request("http://localhost/api/runs/gw-run-42", {
      method: "GET",
      headers,
    });

    const res = await GET(req, { params: { id: "gw-run-42" } });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.run.id).toBe("gw-run-42");

    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(`${gatewayBaseUrl}/runs/gw-run-42`);
    expect(init?.method).toBe("GET");
  });

  it("returns gateway error payload when gateway fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "missing" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      })
    );

    const headers = await authCookieHeader("viewer");
    const req = new Request("http://localhost/api/runs/gw-missing", {
      method: "GET",
      headers,
    });

    const res = await GET(req, { params: { id: "gw-missing" } });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error?.code).toBe("GATEWAY_RUN_GET_FAILED");
  });
});
