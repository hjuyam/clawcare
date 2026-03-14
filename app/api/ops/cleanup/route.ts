import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseJsonBody } from "../_utils";
import { requireRole } from "@/app/api/_lib/auth";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";
import { createAndScheduleRun } from "@/app/api/_lib/runFromRequest";
import { gatewayClient, GatewayError } from "@/app/api/_lib/gatewayClient";

const CleanupSchema = z
  .object({
    reason: z.string().min(3).optional(),
    dry_run: z.boolean().optional(),
    confirm: z.boolean().optional(),
  })
  .strict();

async function emitAudit(request: Request, payload: Record<string, unknown>) {
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
  const parsed = await parseJsonBody(req, CleanupSchema);
  if (!parsed.ok) return parsed.response;

  // Contract (M1): operator can request cleanup (admin will also pass).
  const auth = await requireRole(req, "operator", {
    action: "ops.cleanup",
    resource_type: "ops",
    requestId: parsed.requestId,
    reason: parsed.data.reason ?? null,
  });
  if (!auth.ok) return auth.response;

  const reason = parsed.data.reason ?? "(no reason provided)";
  const confirm = parsed.data.confirm ?? false;
  const dry_run = parsed.data.dry_run ?? !confirm;

  // dry_run is allowed without confirm (safe preview)
  if (!dry_run && !confirm) {
    await emitAudit(req, {
      action: "ops.cleanup",
      resource_type: "ops",
      reason,
      status: "rejected",
      duration_ms: Date.now() - startedAt,
      request_id: parsed.requestId,
      error_code: "CONFIRM_REQUIRED",
    });

    return errorResponse(
      "CONFIRM_REQUIRED",
      "Cleanup requires confirm=true unless dry_run=true",
      parsed.requestId,
      409,
    );
  }

  if (dry_run) {
    await emitAudit(req, {
      action: "ops.cleanup",
      resource_type: "ops",
      reason,
      status: "preview",
      duration_ms: Date.now() - startedAt,
      request_id: parsed.requestId,
    });

    return NextResponse.json({
      status: "preview",
      mode: "mock",
      dry_run: true,
      plan: {
        will_delete: ["/tmp/openclaw/tmp_* (older than 24h)", "*.bak in workspace root"],
      },
    });
  }

  // For non-dry-run, enforce Safe Mode.
  const safe = await enforceSafeMode({
    request: req,
    requestId: parsed.requestId,
    action: "ops.cleanup",
    resource_type: "ops",
    reason,
    confirm: true,
    session: auth.session,
  });
  if (!safe.ok) return safe.response;

  if (gatewayClient.isEnabled()) {
    try {
      const data = await gatewayClient.createRun({
        type: "ops.cleanup",
        reason,
        input: { reason },
      });
      const runId = (data as any)?.run?.id ?? (data as any)?.run_id ?? (data as any)?.id ?? null;

      await emitAudit(req, {
        action: "ops.cleanup",
        resource_type: "ops",
        reason,
        status: "queued",
        duration_ms: Date.now() - startedAt,
        request_id: parsed.requestId,
        run_id: runId,
      });

      return NextResponse.json({
        status: "executed",
        mode: "gateway",
        dry_run: false,
        run_id: runId,
        requested_at: new Date().toISOString(),
        gateway: data,
      });
    } catch (err: any) {
      const e = err as GatewayError;
      return NextResponse.json(
        {
          error: {
            code: "GATEWAY_CLEANUP_FAILED",
            message: e?.message ?? String(err),
            status: e?.status ?? 500,
            details: e?.body ?? null,
          },
        },
        { status: e?.status ?? 502 },
      );
    }
  }

  const run = await createAndScheduleRun({
    type: "ops.cleanup",
    session: auth.session,
    reason,
    input: { reason },
  });

  await emitAudit(req, {
    action: "ops.cleanup",
    resource_type: "ops",
    reason,
    status: "queued",
    duration_ms: Date.now() - startedAt,
    request_id: parsed.requestId,
    run_id: run.id,
  });

  // Keep legacy contract fields for tests/clients, but include run_id.
  return NextResponse.json({
    status: "executed",
    mode: "mock",
    dry_run: false,
    run_id: run.id,
    requested_at: new Date().toISOString(),
  });
}
