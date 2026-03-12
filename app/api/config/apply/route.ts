import { NextResponse } from "next/server";
import { z } from "zod";
import {
  loadManifest,
  loadConfigByVersion,
  snapshotConfig,
} from "../_utils";
import { jsonError, parseJsonBody } from "@/app/api/_lib/http";
import { requireRole } from "@/app/api/_lib/auth";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";

const ApplySchema = z
  .object({
    config: z.record(z.unknown()),
    base_version: z.string(),
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

  const { config: nextConfig, base_version, author, reason } = parsed.data;

  const manifest = await loadManifest();
  if (manifest.currentVersion !== base_version) {
    await emitAudit(req, {
      action: "config.apply",
      resource_type: "config",
      reason: reason ?? null,
      status: "rejected",
      duration_ms: Date.now() - startedAt,
      request_id: parsed.requestId,
      error_code: "CONFLICT",
    });

    return jsonError(
      "CONFLICT",
      "base_version mismatch",
      parsed.requestId,
      409,
    );
  }

  const currentLoaded = await loadConfigByVersion(manifest.currentVersion);
  const currentConfig = currentLoaded?.config ?? {};

  // Auto snapshot before apply
  const snap1 = await snapshotConfig(currentConfig, manifest, {
    author: "system",
    reason: "auto-snapshot before apply",
  });

  const snap2 = await snapshotConfig(nextConfig, snap1.manifest, {
    author,
    reason,
  });

  await emitAudit(req, {
    action: "config.apply",
    resource_type: "config",
    reason: reason ?? null,
    status: "applied",
    duration_ms: Date.now() - startedAt,
    request_id: parsed.requestId,
  });

  return NextResponse.json({
    current_version: snap2.entry.version,
  });
}
