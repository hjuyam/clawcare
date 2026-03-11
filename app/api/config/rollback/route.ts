import { NextResponse } from "next/server";
import {
  loadManifest,
  loadConfigByVersion,
  snapshotConfig,
} from "../_utils";

export async function POST(req: Request) {
  const body = await req.json();
  const targetVersion = body?.version;
  const author = body?.author;
  const reason = body?.reason ?? `rollback to ${targetVersion}`;

  if (!targetVersion) {
    return NextResponse.json(
      { error: "version is required" },
      { status: 400 }
    );
  }

  const manifest = await loadManifest();
  const targetLoaded = await loadConfigByVersion(targetVersion);
  if (!targetLoaded) {
    return NextResponse.json(
      { error: "version not found", version: targetVersion },
      { status: 404 }
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

  return NextResponse.json({
    ok: true,
    version: snap.entry.version,
    rolled_back_to: targetVersion,
    self_check: selfCheck,
  });
}
