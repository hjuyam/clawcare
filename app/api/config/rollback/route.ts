import { NextResponse } from "next/server.js";
import { z } from "zod";
import { parseJsonBody } from "@/app/api/_lib/http";
import { requireRole } from "@/app/api/_lib/auth";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";
import { createAndScheduleRun } from "@/app/api/_lib/runFromRequest";
import { loadManifest, loadConfigByVersion } from "../_utils";
import { gatewayClient, GatewayError } from "@/app/api/_lib/gatewayClient";

const RollbackSchema = z
  .object({
    // legacy
    target_version: z.string().optional(),
    // legacy/v2 placeholder
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

  if (gatewayClient.isEnabled()) {
    try {
      const data = await gatewayClient.createRun({
        type: "config.rollback",
        reason: parsed.data.reason ?? null,
        input: {
          target_version: parsed.data.target_version ?? null,
          snapshot_id: parsed.data.snapshot_id ?? null,
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
            code: "GATEWAY_CONFIG_ROLLBACK_FAILED",
            message: e?.message ?? String(err),
            status: e?.status ?? 500,
            details: e?.body ?? null,
          },
        },
        { status: e?.status ?? 502 },
      );
    }
  }

  const manifest = await loadManifest();

  // Prefer explicit target_version; keep snapshot_id as a compatibility alias (treated as a version for now).
  let targetVersion = parsed.data.target_version ?? parsed.data.snapshot_id ?? null;

  // Fallback: rollback to previous entry.
  if (!targetVersion) {
    const idx = manifest.entries.findIndex((e) => e.version === manifest.currentVersion);
    const prev = idx > 0 ? manifest.entries[idx - 1] : null;
    if (!prev) {
      return NextResponse.json(
        {
          error: {
            code: "NO_PREVIOUS_VERSION",
            message: "No previous version to rollback to",
            requestId: parsed.requestId,
          },
        },
        { status: 409 },
      );
    }
    targetVersion = prev.version;
  }

  const loaded = await loadConfigByVersion(targetVersion);
  if (!loaded) {
    return NextResponse.json(
      {
        error: {
          code: "TARGET_VERSION_NOT_FOUND",
          message: `target_version=${targetVersion} not found`,
          requestId: parsed.requestId,
        },
      },
      { status: 404 },
    );
  }

  const run = await createAndScheduleRun({
    type: "config.rollback",
    session: auth.session,
    reason: parsed.data.reason ?? "(no reason provided)",
    input: {
      target_version: targetVersion,
      snapshot_id: parsed.data.snapshot_id ?? null,
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
    rolled_back_to: targetVersion,
  });
}
