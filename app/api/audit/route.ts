import { NextRequest, NextResponse } from "next/server";
import { readAuditEvents } from "@/app/api/_lib/audit";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const resource_type = searchParams.get("resource_type");

  const events = await readAuditEvents({ action, resource_type });
  return NextResponse.json({ count: events.length, events });
}
