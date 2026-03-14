import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/app/api/_lib/http";
import { requireRole } from "@/app/api/_lib/auth";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";
import { createAndScheduleRun } from "@/app/api/_lib/runFromRequest";
import { loadManifest } from "../_utils";
import { gatewayClient, GatewayError } from "@/app/api/_lib/gatewayClient";

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

  if (gatewayClient.isEnabled()) {
    try {
      const data = await gatewayClient.createRun({
        type: "config.apply",
        reason: parsed.data.reason ?? null,
        input: {
          config: parsed.data.config ?? {},
          base_version: parsed.data.base_version ?? null,
          author: parsed.data.author ?? null,
          reason: parsed.data.reason ?? null,
        },
      });
      const runId = (data as any)?.run?.id ?? (data as any)?.run_id ?? (data as any)?.id ?? null;
      return NextResponse.json({
        status: "queued",
        mode: "gateway",
        run_id: runId,
        gateway: data,
      });
    } catch (err: any) {
      const e = err as GatewayError;
      return NextResponse.json(
        {
          error: {
            code: "GATEWAY_CONFIG_APPLY_FAILED",
            message: e?.message ?? String(err),
            status: e?.status ?? 500,
            details: e?.body ?? null,
          },
        },
        { status: e?.status ?? 502 },
      );
    }
  }

  // M3 semantics (unit-test friendly): queue a run and execute inline.
  // - success path will snapshot + advance current_version
  // - base_version mismatch will fail the run (request still returns 200 queued)
  const manifestBefore = await loadManifest();
  const baseVersion = parsed.data.base_version ?? manifestBefore.currentVersion;

  const run = await createAndScheduleRun({
    type: "config.apply",
    session: auth.session,
    reason: parsed.data.reason ?? "(no reason provided)",
    input: {
      config: parsed.data.config ?? {},
      base_version: baseVersion,
      author: parsed.data.author ?? null,
      reason: parsed.data.reason ?? null,
    },
  });

  const manifestAfter = await loadManifest();

  return NextResponse.json({
    status: "queued",
    mode: "inline",
    run_id: run.id,
    current_version: manifestAfter.currentVersion,
  });
}
