import { NextRequest, NextResponse } from "next/server";
import { readAuditEvents } from "@/app/api/_lib/audit";
import { requireRole } from "@/app/api/_lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireRole(request, "viewer", {
    action: "audit.list",
    resource_type: "audit",
  });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const resource_type = searchParams.get("resource_type");
  const actor = searchParams.get("actor");
  const start_time = searchParams.get("start");
  const end_time = searchParams.get("end");
  const limit = Number(searchParams.get("limit") ?? "200");

  const events = await readAuditEvents({
    action,
    resource_type,
    actor,
    start_time,
    end_time,
    limit: Number.isFinite(limit) ? limit : 200,
  });
  return NextResponse.json({
    items: events,
    nextCursor: null,
    hasMore: false,
  });
}
