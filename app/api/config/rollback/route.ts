import { NextResponse } from "next/server.js";
import { z } from "zod";
import { parseJsonBody } from "@/app/api/_lib/http";
import { requireRole } from "@/app/api/_lib/auth";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";
import { createAndScheduleRun } from "@/app/api/_lib/runFromRequest";

const RollbackSchema = z
  .object({
    // legacy
    target_version: z.string().optional(),
    // v2 (earlier work)
    snapshot_id: z.string().optional(),
    author: z.string().optional(),
    reason: z.string().min(2).optional(),
    confirm: z.boolean().optional(),
  })
  .strict();

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, RollbackSchema);
  if (!parsed.ok) return parsed.response;

  const auth = await requireRole(req, "admin", {
    action: "config.rollback",
    resource_type: "config",
    requestId: parsed.requestId,
    reason: parsed.data.reason ?? null,
  });
  if (!auth.ok) return auth.response;

  const safe = await enforceSafeMode({
    request: req,
    requestId: parsed.requestId,
    action: "config.rollback",
    resource_type: "config",
    reason: parsed.data.reason ?? null,
    session: auth.session,
  });
  if (!safe.ok) return safe.response;

  const confirm = parsed.data.confirm ?? false;
  if (!confirm) {
    return NextResponse.json(
      {
        error: {
          code: "CONFIRM_REQUIRED",
          message: "Config rollback requires confirm=true",
          requestId: parsed.requestId,
        },
      },
      { status: 409 },
    );
  }

  const run = await createAndScheduleRun({
    type: "config.rollback",
    session: auth.session,
    reason: parsed.data.reason ?? "(no reason provided)",
    input: {
      target_version: parsed.data.target_version ?? null,
      snapshot_id: parsed.data.snapshot_id ?? null,
      author: parsed.data.author ?? null,
    },
  });

  return NextResponse.json({
    status: "queued",
    mode: "mock",
    run_id: run.id,
  });
}
