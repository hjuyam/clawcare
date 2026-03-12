import { describe, it, expect } from "vitest";
import { requireRole } from "@/app/api/_lib/auth";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";

const request = new Request("http://localhost/api/ops/restart_gateway", {
  method: "POST",
});

describe("RBAC", () => {
  it("denies access when role is insufficient", async () => {
    const result = await requireRole(request, "admin", {
      action: "ops.restart_gateway",
      resource_type: "ops",
      requestId: "req-rbac",
      sessionOverride: {
        session_id: "sess-1",
        user_id: "user-1",
        role: "viewer",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10000).toISOString(),
      },
    });

    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(403);
  });
});

describe("Safe mode", () => {
  it("blocks restricted actions when enabled", async () => {
    const result = await enforceSafeMode({
      request,
      requestId: "req-safe",
      action: "config.apply",
      resource_type: "config",
      reason: "deploy",
      session: {
        session_id: "sess-2",
        user_id: "user-2",
        role: "admin",
      },
      safeModeOverride: { enabled: true, reason: "maintenance" },
    });

    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(403);
  });
});
