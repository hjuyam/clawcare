import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { GET } from "../route";
import { authCookieHeader } from "@/tests/_helpers/auth";

const AUDIT_PATH = path.join(process.cwd(), "data", "audit", "events.jsonl");

const fixtureEvents = [
  {
    event_id: "evt-1",
    event_time: "2026-03-10T00:00:00.000Z",
    actor_type: "user",
    actor_id: "alice",
    action: "ops.cleanup",
    resource_type: "ops",
    resource_id: null,
    policy_decision: null,
    policy_reason: null,
    status: "queued",
    reason: "test",
  },
  {
    event_id: "evt-2",
    event_time: "2026-03-11T00:00:00.000Z",
    actor_type: "user",
    actor_id: "bob",
    action: "config.apply",
    resource_type: "config",
    resource_id: null,
    policy_decision: "deny",
    policy_reason: "safe_mode",
    status: "rejected",
    reason: "deploy",
  },
  {
    event_id: "evt-3",
    event_time: "2026-03-12T00:00:00.000Z",
    actor_type: "user",
    actor_id: "alice",
    action: "runs.create",
    resource_type: "runs",
    resource_id: "run-1",
    policy_decision: null,
    policy_reason: null,
    status: "ok",
    reason: "diag",
  },
];

describe("GET /api/audit", () => {
  let original: string | null = null;

  beforeEach(async () => {
    try {
      original = await fs.readFile(AUDIT_PATH, "utf8");
    } catch (err: any) {
      if (err?.code !== "ENOENT") throw err;
      original = null;
    }

    await fs.mkdir(path.dirname(AUDIT_PATH), { recursive: true });
    await fs.writeFile(
      AUDIT_PATH,
      fixtureEvents.map((event) => JSON.stringify(event)).join("\n") + "\n",
      "utf8"
    );
  });

  afterEach(async () => {
    if (original === null) {
      try {
        await fs.unlink(AUDIT_PATH);
      } catch (err: any) {
        if (err?.code !== "ENOENT") throw err;
      }
    } else {
      await fs.writeFile(AUDIT_PATH, original, "utf8");
    }
  });

  it("filters by actor", async () => {
    const auth = await authCookieHeader("viewer");
    const req = new Request("http://localhost/api/audit?actor=alice", {
      headers: { ...auth },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    const ids = (data.items ?? []).map((item: any) => item.event_id);
    expect(ids).toEqual(expect.arrayContaining(["evt-1", "evt-3"]));
    expect(ids).not.toEqual(expect.arrayContaining(["evt-2"]));
  });

  it("filters by action and time range", async () => {
    const auth = await authCookieHeader("viewer");
    const params = new URLSearchParams({
      action: "runs.create",
      start: "2026-03-11T12:00:00.000Z",
      end: "2026-03-12T23:59:59.000Z",
    });
    const req = new Request(`http://localhost/api/audit?${params.toString()}`, {
      headers: { ...auth },
    });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items.length).toBe(1);
    expect(data.items[0].event_id).toBe("evt-3");
  });
});
