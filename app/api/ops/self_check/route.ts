import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "../_utils";
import { requireRole } from "@/app/api/_lib/auth";

const SelfCheckSchema = z.object({}).strict();

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, SelfCheckSchema);
  if (!parsed.ok) return parsed.response;

  const auth = await requireRole(req, "viewer", {
    action: "ops.self_check",
    resource_type: "ops",
    requestId: parsed.requestId,
  });
  if (!auth.ok) return auth.response;

  const checks = [
    { id: "gateway.connectivity", status: "ok", message: "Gateway reachable" },
    {
      id: "gateway.disk",
      status: "warnings",
      message: "Disk usage at 78% (mock)",
    },
    {
      id: "gateway.config",
      status: "errors",
      message: "Stale config detected (mock)",
    },
  ] as const;

  const summary = {
    ok: checks.filter((c) => c.status === "ok").length,
    warnings: checks.filter((c) => c.status === "warnings").length,
    errors: checks.filter((c) => c.status === "errors").length,
  };

  return NextResponse.json({
    status: summary.errors > 0 ? "degraded" : "ok",
    mode: "mock",
    summary,
    checks,
    timestamp: new Date().toISOString(),
  });
}
