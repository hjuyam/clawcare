import { NextResponse } from "next/server";
import {
  loadManifest,
  loadConfigByVersion,
  snapshotConfig,
} from "../_utils";

export async function POST(req: Request) {
  const body = await req.json();
  const nextConfig = body?.config;
  const baseVersion = body?.base_version;
  const author = body?.author;
  const reason = body?.reason;

  if (!nextConfig || !baseVersion) {
    return NextResponse.json(
      { error: "config and base_version are required" },
      { status: 400 }
    );
  }

  const manifest = await loadManifest();
  if (manifest.currentVersion !== baseVersion) {
    return NextResponse.json(
      {
        error: "base_version mismatch",
        current_version: manifest.currentVersion,
      },
      { status: 409 }
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

  return NextResponse.json({
    version: snap2.entry.version,
  });
}
