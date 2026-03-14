import { NextResponse } from "next/server";
import { loadManifest, loadConfigByVersion, hashConfig } from "../_utils";
import { requireRole } from "@/app/api/_lib/auth";
import { gatewayClient, GatewayError } from "@/app/api/_lib/gatewayClient";

export async function GET(request: Request) {
  const auth = await requireRole(request, "viewer", {
    action: "config.current",
    resource_type: "config",
  });
  if (!auth.ok) return auth.response;

  if (gatewayClient.isEnabled()) {
    try {
      const data = await gatewayClient.getConfig();
      if (data && typeof data === "object" && "current_version" in data) {
        return NextResponse.json({ ...(data as Record<string, unknown>), mode: "gateway" });
      }
      const config = (data as any)?.config ?? data ?? {};
      const etag = hashConfig(config);
      return NextResponse.json({
        current_version: "gateway",
        etag,
        config,
        mode: "gateway",
      });
    } catch (err: any) {
      const e = err as GatewayError;
      return NextResponse.json(
        {
          error: {
            code: "GATEWAY_CONFIG_GET_FAILED",
            message: e?.message ?? String(err),
            status: e?.status ?? 500,
            details: e?.body ?? null,
          },
        },
        { status: e?.status ?? 502 },
      );
    }
  }

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
