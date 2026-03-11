import { NextResponse } from "next/server";
import { diffJson } from "diff";
import {
  loadManifest,
  loadConfigByVersion,
  maskSensitive,
} from "../_utils";

export async function POST(req: Request) {
  const body = await req.json();
  const nextConfig = body?.config ?? {};
  const manifest = await loadManifest();
  const currentVersion = manifest.currentVersion;
  const loaded = await loadConfigByVersion(currentVersion);
  const currentConfig = loaded?.config ?? {};

  const maskedCurrent = maskSensitive(currentConfig);
  const maskedNext = maskSensitive(nextConfig);

  const diff = diffJson(maskedCurrent, maskedNext);

  return NextResponse.json({
    version: currentVersion,
    diff,
    masked_current: maskedCurrent,
    masked_next: maskedNext,
  });
}
