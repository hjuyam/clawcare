import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/app/api/_lib/http";
import { requireRole } from "@/app/api/_lib/auth";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";
import { createAndScheduleRun } from "@/app/api/_lib/runFromRequest";

const ApplySchema = z
  .object({
    config: z.record(z.unknown()).optional(),
    base_version: z.string().optional(),
    author: z.string().optional(),
    reason: z.string().min(2).optional(),
    confirm: z.boolean().optional(),
  })
  .strict();

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, ApplySchema);
  if (!parsed.ok) return parsed.response;

  const auth = await requireRole(req, "admin", {
    action: "config.apply",
    resource_type: "config",
    requestId: parsed.requestId,
    reason: parsed.data.reason ?? null,
  });
  if (!auth.ok) return auth.response;

  const safe = await enforceSafeMode({
    request: req,
    requestId: parsed.requestId,
    action: "config.apply",
    resource_type: "config",
    reason: parsed.data.reason ?? null,
    session: auth.session,
  });
  if (!safe.ok) return safe.response;

  // M1 contract: in safe mode, even unconfirmed should be rejected.
  const confirm = parsed.data.confirm ?? false;
  if (!confirm) {
    return NextResponse.json(
      {
        error: {
          code: "CONFIRM_REQUIRED",
          message: "Config apply requires confirm=true",
          requestId: parsed.requestId,
        },
      },
      { status: 409 },
    );
  }

  const run = await createAndScheduleRun({
    type: "config.apply",
    session: auth.session,
    reason: parsed.data.reason ?? "(no reason provided)",
    input: {
      config: parsed.data.config ?? {},
      base_version: parsed.data.base_version ?? null,
      author: parsed.data.author ?? null,
    },
  });

  return NextResponse.json({
    status: "queued",
    mode: "mock",
    run_id: run.id,
  });
}
