import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseJsonBody } from "../_utils";

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

  await emitAudit(req, {
    action: "ops.restart_gateway",
    resource_type: "ops",
    reason,
    status: "queued",
    duration_ms: Date.now() - startedAt,
    request_id: parsed.requestId,
  });

  return NextResponse.json({
    status: "queued",
    mode: "mock",
    reason,
    requested_at: new Date().toISOString(),
  });
}
