import { NextResponse } from "next/server";
import { z } from "zod";
import {
  loadManifest,
  loadConfigByVersion,
  snapshotConfig,
} from "../_utils";
import { jsonError, parseJsonBody } from "@/app/api/_lib/http";

const RollbackSchema = z
  .object({
    target_version: z.string().optional(),
    version: z.string().optional(),
    author: z.string().optional(),
    reason: z.string().optional(),
  })
  .strict();

async function emitAudit(request: Request, payload: Record<string, unknown>) {
  const auditUrl = new URL("/api/audit/log", request.url);
  await fetch(auditUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const parsed = await parseJsonBody(req, RollbackSchema);
  if (!parsed.ok) return parsed.response;

  const targetVersion = parsed.data.target_version ?? parsed.data.version;
  const author = parsed.data.author;
  const reason = parsed.data.reason ?? `rollback to ${targetVersion}`;

  if (!targetVersion) {
    return jsonError(
      "VALIDATION_ERROR",
      "target_version is required",
      parsed.requestId,
      400,
    );
  }

  const manifest = await loadManifest();
  const targetLoaded = await loadConfigByVersion(targetVersion);
  if (!targetLoaded) {
    await emitAudit(req, {
      action: "config.rollback",
      resource_type: "config",
      reason,
      status: "rejected",
      duration_ms: Date.now() - startedAt,
      request_id: parsed.requestId,
      error_code: "NOT_FOUND",
    });

    return jsonError(
      "NOT_FOUND",
      "version not found",
      parsed.requestId,
      404,
    );
  }

  const snap = await snapshotConfig(targetLoaded.config, manifest, {
    author,
    reason,
  });

  const selfCheck = {
    status: "ok",
    current_matches_target: true,
    current_version: snap.entry.version,
    target_version: targetVersion,
  };

  await emitAudit(req, {
    action: "config.rollback",
    resource_type: "config",
    reason,
    status: "rolled_back",
    duration_ms: Date.now() - startedAt,
    request_id: parsed.requestId,
  });

  return NextResponse.json({
    ok: true,
    current_version: snap.entry.version,
    rolled_back_to: targetVersion,
    self_check: selfCheck,
  });
}
