import { describe, expect, it } from "vitest";
import { POST as APPLY } from "../apply/route";
import { POST as ROLLBACK } from "../rollback/route";
import { authCookieHeader } from "@/tests/_helpers/auth";
import { loadManifest } from "../_utils";
import { getRun } from "@/app/api/_lib/runsStore";

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

  it("applies config and advances current_version", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const beforeManifest = await loadManifest();

    const req = new Request("http://localhost/api/config/apply", {
      method: "POST",
      headers,
      body: JSON.stringify({
        config: { featureFlag: true },
        base_version: beforeManifest.currentVersion,
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

    const afterManifest = await loadManifest();
    expect(afterManifest.currentVersion).not.toBe(beforeManifest.currentVersion);

    const run = await getRun(data.run_id);
    expect(run?.status).toBe("succeeded");
    expect(run?.result?.before).toBe(beforeManifest.currentVersion);
    expect(run?.result?.after).toBe(afterManifest.currentVersion);
    expect(run?.result?.version).toBe(afterManifest.currentVersion);
  });

  it("rolls back to target version and updates current_version", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const manifest = await loadManifest();
    const targetVersion = manifest.entries[0]?.version ?? manifest.currentVersion;

    const req = new Request("http://localhost/api/config/rollback", {
      method: "POST",
      headers,
      body: JSON.stringify({
        target_version: targetVersion,
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

    const updated = await loadManifest();
    expect(updated.currentVersion).toBe(targetVersion);

    const run = await getRun(data.run_id);
    expect(run?.status).toBe("succeeded");
    expect(run?.result?.before).toBe(manifest.currentVersion);
    expect(run?.result?.after).toBe(targetVersion);
    expect(run?.result?.version).toBe(targetVersion);
  });

  it("fails apply when base_version mismatches", async () => {
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const beforeManifest = await loadManifest();

    const req = new Request("http://localhost/api/config/apply", {
      method: "POST",
      headers,
      body: JSON.stringify({
        config: { featureFlag: false },
        base_version: "v999",
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

    const afterManifest = await loadManifest();
    expect(afterManifest.currentVersion).toBe(beforeManifest.currentVersion);

    const run = await getRun(data.run_id);
    expect(run?.status).toBe("failed");
    expect(run?.error?.code).toBe("BASE_VERSION_MISMATCH");
  });
});
