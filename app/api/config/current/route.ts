import { NextResponse } from "next/server";
import { loadManifest, loadConfigByVersion, hashConfig } from "../_utils";
import { requireRole } from "@/app/api/_lib/auth";

export async function GET(request: Request) {
  const auth = await requireRole(request, "viewer", {
    action: "config.current",
    resource_type: "config",
  });
  if (!auth.ok) return auth.response;

  const manifest = await loadManifest();
  const currentVersion = manifest.currentVersion;
  const loaded = await loadConfigByVersion(currentVersion);
  const config = loaded?.config ?? {};
  const etag = hashConfig(config);
  return NextResponse.json({
    current_version: currentVersion,
    etag,
    config,
  });
}
