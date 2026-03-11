import { NextResponse } from "next/server";
import { loadManifest, loadConfigByVersion, hashConfig } from "../_utils";

export async function GET() {
  const manifest = await loadManifest();
  const currentVersion = manifest.currentVersion;
  const loaded = await loadConfigByVersion(currentVersion);
  const config = loaded?.config ?? {};
  const etag = hashConfig(config);
  return NextResponse.json({
    version: currentVersion,
    etag,
    config,
  });
}
