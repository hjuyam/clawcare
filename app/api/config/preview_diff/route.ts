import { NextResponse } from "next/server";
import { diffJson } from "diff";
import { z } from "zod";
import {
  loadManifest,
  loadConfigByVersion,
  maskSensitive,
} from "../_utils";
import { parseJsonBody } from "@/app/api/_lib/http";
import { requireRole } from "@/app/api/_lib/auth";
import { gatewayClient, GatewayError } from "@/app/api/_lib/gatewayClient";

const PreviewSchema = z
  .object({
    config: z.record(z.unknown()).optional(),
    base_version: z.string().optional(),
  })
  .strict();

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, PreviewSchema);
  if (!parsed.ok) return parsed.response;

  const auth = await requireRole(req, "viewer", {
    action: "config.preview_diff",
    resource_type: "config",
    requestId: parsed.requestId,
  });
  if (!auth.ok) return auth.response;

  if (gatewayClient.isEnabled()) {
    try {
      const data = await gatewayClient.previewConfigDiff(parsed.data);
      return NextResponse.json({ ...(data as Record<string, unknown>), mode: "gateway" });
    } catch (err: any) {
      const e = err as GatewayError;
      return NextResponse.json(
        {
          error: {
            code: "GATEWAY_CONFIG_PREVIEW_FAILED",
            message: e?.message ?? String(err),
            status: e?.status ?? 500,
            details: e?.body ?? null,
          },
        },
        { status: e?.status ?? 502 },
      );
    }
  }

  const nextConfig = parsed.data.config ?? {};
  const manifest = await loadManifest();
  const currentVersion = manifest.currentVersion;
  const loaded = await loadConfigByVersion(currentVersion);
  const currentConfig = loaded?.config ?? {};

  const maskedCurrent = maskSensitive(currentConfig);
  const maskedNext = maskSensitive(nextConfig);

  const diff = diffJson(maskedCurrent as object, maskedNext as object);

  return NextResponse.json({
    current_version: currentVersion,
    base_version: parsed.data.base_version ?? currentVersion,
    diff,
    masked_current: maskedCurrent,
    masked_next: maskedNext,
  });
}
