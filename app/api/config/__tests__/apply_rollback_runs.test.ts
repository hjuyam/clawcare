import { describe, expect, it } from "vitest";
import { POST as APPLY } from "../apply/route";
import { POST as ROLLBACK } from "../rollback/route";
import { authCookieHeader } from "@/tests/_helpers/auth";

function dump(res: Response, data: any) {
  return { status: res.status, body: data };
}

describe("config apply/rollback via runs", () => {
  it("requires confirm for apply", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const req = new Request("http://localhost/api/config/apply", {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: "apply" }),
    });

    const res = await APPLY(req);
    expect(res.status).toBe(409);
  });

  it("queues run for apply when confirmed", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const req = new Request("http://localhost/api/config/apply", {
      method: "POST",
      headers,
      body: JSON.stringify({
        config: { featureFlag: true },
        base_version: "v1",
        author: "unit-test",
        reason: "apply",
        confirm: true,
      }),
    });

    const res = await APPLY(req);
    const data = await res.json();
    if (res.status !== 200) {
      throw new Error(JSON.stringify(dump(res, data), null, 2));
    }
    expect(data.status).toBe("queued");
    expect(typeof data.run_id).toBe("string");
  });

  it("queues run for rollback when confirmed", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const req = new Request("http://localhost/api/config/rollback", {
      method: "POST",
      headers,
      body: JSON.stringify({
        target_version: "v1",
        author: "unit-test",
        reason: "rb",
        confirm: true,
      }),
    });

    const res = await ROLLBACK(req);
    const data = await res.json();
    if (res.status !== 200) {
      throw new Error(JSON.stringify(dump(res, data), null, 2));
    }

    expect(data.status).toBe("queued");
    expect(typeof data.run_id).toBe("string");
  });
});
