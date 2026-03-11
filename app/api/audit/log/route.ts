import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent, buildAuditEvent } from "@/app/api/_lib/audit";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const event = buildAuditEvent(payload);
  await appendAuditEvent(event);
  return NextResponse.json({ status: "ok", event_id: event.event_id });
}
