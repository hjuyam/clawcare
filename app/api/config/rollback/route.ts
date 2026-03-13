import { NextResponse } from "next/server.js";
import { z } from "zod";
import { parseJsonBody } from "@/app/api/_lib/http";
import { requireRole } from "@/app/api/_lib/auth";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";
import { createAndScheduleRun } from "@/app/api/_lib/runFromRequest";
import { loadManifest, loadConfigByVersion, snapshotConfig } from "../_utils";

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

  const manifest = await loadManifest();

  // Prefer explicit target_version; keep snapshot_id as a compatibility alias (treated as a version for now).
  let targetVersion =
    parsed.data.target_version ?? parsed.data.snapshot_id ?? null;

  // Fallback: rollback to previous entry.
  if (!targetVersion) {
    const idx = manifest.entries.findIndex(
      (e) => e.version === manifest.currentVersion,
    );
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

  // Rollback by creating a new snapshot (immutable history) that points to the target config.
  const snap = await snapshotConfig(loaded.config, manifest, {
    author: parsed.data.author ?? auth.session.user?.name ?? "unknown",
    reason: parsed.data.reason ?? `rollback to ${targetVersion}`,
  });

  const run = await createAndScheduleRun({
    type: "config.rollback",
    session: auth.session,
    reason: parsed.data.reason ?? "(no reason provided)",
    input: {
      from_version: manifest.currentVersion,
      target_version: targetVersion,
      new_version: snap.entry.version,
      author: parsed.data.author ?? null,
      snapshot_id: parsed.data.snapshot_id ?? null,
    },
  });

  return NextResponse.json({
    status: "queued",
    mode: "persisted",
    run_id: run.id,
    current_version: snap.manifest.currentVersion,
    new_entry: snap.entry,
    rolled_back_from: manifest.currentVersion,
    rolled_back_to: targetVersion,
  });
}
