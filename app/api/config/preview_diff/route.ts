import { NextResponse } from "next/server";
import { diffJson } from "diff";
import { z } from "zod";
import {
  loadManifest,
  loadConfigByVersion,
  maskSensitive,
} from "../_utils";
import { parseJsonBody } from "@/app/api/_lib/http";

const PreviewSchema = z
  .object({
    config: z.record(z.unknown()).optional(),
    base_version: z.string().optional(),
  })
  .strict();

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, PreviewSchema);
  if (!parsed.ok) return parsed.response;

  const nextConfig = parsed.data.config ?? {};
  const manifest = await loadManifest();
  const currentVersion = manifest.currentVersion;
  const loaded = await loadConfigByVersion(currentVersion);
  const currentConfig = loaded?.config ?? {};

  const maskedCurrent = maskSensitive(currentConfig);
  const maskedNext = maskSensitive(nextConfig);

  const diff = diffJson(maskedCurrent, maskedNext);

  return NextResponse.json({
    current_version: currentVersion,
    base_version: parsed.data.base_version ?? currentVersion,
    diff,
    masked_current: maskedCurrent,
    masked_next: maskedNext,
  });
}
