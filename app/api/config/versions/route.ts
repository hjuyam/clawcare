import { NextResponse } from "next/server";
import { loadManifest } from "../_utils";
import { requireRole } from "@/app/api/_lib/auth";
import { gatewayClient, GatewayError } from "@/app/api/_lib/gatewayClient";

export async function GET(req: Request) {
  const auth = await requireRole(req, "viewer", {
    action: "config.versions",
    resource_type: "config",
  });
  if (!auth.ok) return auth.response;

  if (gatewayClient.isEnabled()) {
    try {
      const data = await gatewayClient.listConfigVersions();
      return NextResponse.json({ ...(data as Record<string, unknown>), mode: "gateway" });
    } catch (err: any) {
      const e = err as GatewayError;
      return NextResponse.json(
        {
          error: {
            code: "GATEWAY_CONFIG_VERSIONS_FAILED",
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
  return NextResponse.json({
    current_version: manifest.currentVersion,
    entries: manifest.entries,
  });
}
