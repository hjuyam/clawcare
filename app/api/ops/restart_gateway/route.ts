import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseJsonBody } from "../_utils";
import { requireRole } from "@/app/api/_lib/auth";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";
import { createAndScheduleRun } from "@/app/api/_lib/runFromRequest";

const RestartSchema = z
  .object({
    reason: z.string().min(3, "Reason is required"),
    confirm: z.boolean().optional(),
  })
  .strict();

async function emitAudit(request: Request, payload: Record<string, unknown>) {
  // Best-effort: unit tests call handlers with synthetic request.url (may not be reachable).
  try {
    const auditUrl = new URL("/api/audit/log", request.url);
    await fetch(auditUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const parsed = await parseJsonBody(req, RestartSchema);
  if (!parsed.ok) return parsed.response;

  const auth = await requireRole(req, "admin", {
    action: "ops.restart_gateway",
    resource_type: "ops",
    requestId: parsed.requestId,
    reason: parsed.data.reason ?? null,
  });
  if (!auth.ok) return auth.response;

  const safe = await enforceSafeMode({
    request: req,
    requestId: parsed.requestId,
    action: "ops.restart_gateway",
    resource_type: "ops",
    reason: parsed.data.reason ?? null,
    session: auth.session,
  });
  if (!safe.ok) return safe.response;

  const { reason, confirm } = parsed.data;
  if (!confirm) {
    await emitAudit(req, {
      action: "ops.restart_gateway",
      resource_type: "ops",
      reason,
      status: "rejected",
      duration_ms: Date.now() - startedAt,
      request_id: parsed.requestId,
      error_code: "CONFIRM_REQUIRED",
    });

    return errorResponse(
      "CONFIRM_REQUIRED",
      "Restart requires confirm=true",
      parsed.requestId,
      409,
    );
  }

  const run = await createAndScheduleRun({
    type: "ops.restart_gateway",
    session: auth.session,
    reason,
    input: { reason },
  });

  await emitAudit(req, {
    action: "ops.restart_gateway",
    resource_type: "ops",
    reason,
    status: "queued",
    duration_ms: Date.now() - startedAt,
    request_id: parsed.requestId,
    run_id: run.id,
  });

  return NextResponse.json({
    status: "queued",
    mode: "mock",
    run_id: run.id,
    reason,
    requested_at: new Date().toISOString(),
  });
}
