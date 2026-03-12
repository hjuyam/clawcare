import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/app/api/_lib/auth";
import { parseJsonBody } from "@/app/api/_lib/http";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";
import { createAndScheduleRun } from "@/app/api/_lib/runFromRequest";

const CreateSchema = z
  .object({
    reason: z.string().min(3).optional(),
    confirm: z.boolean().optional(),
  })
  .strict();

export async function GET(request: Request) {
  // keep legacy mock bundle read endpoint
  const auth = await requireRole(request, "viewer", {
    action: "ops.diagnostics_bundle",
    resource_type: "ops",
  });
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    mode: "mock",
    generatedAt: new Date().toISOString(),
    gateway: {
      status: "degraded",
      version: "0.0.0-mock",
      uptimeSeconds: 3600,
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      arch: process.arch,
    },
    checks: {
      lastSelfCheck: "2026-03-11T16:00:00.000Z",
      warnings: ["Disk usage at 78% (mock)"],
      errors: ["Stale config detected (mock)"],
    },
    redactions: {
      user: "[redacted]",
      host: "[redacted]",
      ip: "[redacted]",
    },
  });
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, CreateSchema);
  if (!parsed.ok) return parsed.response;

  const auth = await requireRole(req, "admin", {
    action: "ops.diagnostics_bundle",
    resource_type: "ops",
    requestId: parsed.requestId,
    reason: parsed.data.reason ?? null,
  });
  if (!auth.ok) return auth.response;

  const safe = await enforceSafeMode({
    request: req,
    requestId: parsed.requestId,
    action: "ops.diagnostics_bundle",
    resource_type: "ops",
    reason: parsed.data.reason ?? null,
    session: auth.session,
  });
  if (!safe.ok) return safe.response;

  const reason = parsed.data.reason ?? "(no reason provided)";
  const confirm = parsed.data.confirm ?? false;
  if (!confirm) {
    return NextResponse.json(
      {
        error: {
          code: "CONFIRM_REQUIRED",
          message: "Diagnostics bundle requires confirm=true",
          requestId: parsed.requestId,
        },
      },
      { status: 409 },
    );
  }

  const run = await createAndScheduleRun({
    type: "ops.diagnostics_bundle",
    session: auth.session,
    reason,
    input: { reason },
  });

  return NextResponse.json({
    status: "queued",
    mode: "mock",
    run_id: run.id,
    requested_at: new Date().toISOString(),
  });
}
