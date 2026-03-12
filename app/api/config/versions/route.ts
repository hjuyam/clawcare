import { NextResponse } from "next/server";
import { loadManifest } from "../_utils";
import { requireRole } from "@/app/api/_lib/auth";

export async function GET(req: Request) {
  const auth = await requireRole(req, "viewer", {
    action: "config.versions",
    resource_type: "config",
  });
  if (!auth.ok) return auth.response;

  const manifest = await loadManifest();
  return NextResponse.json({
    current_version: manifest.currentVersion,
    entries: manifest.entries,
  });
}
