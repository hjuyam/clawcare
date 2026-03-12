import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendAuditEvent, buildAuditEvent } from "@/app/api/_lib/audit";
import { parseJsonBody } from "@/app/api/_lib/http";

const AuditSchema = z
  .object({
    action: z.string().optional(),
    resource_type: z.string().optional(),
    reason: z.string().optional(),
    status: z.string().optional(),
    duration_ms: z.number().optional(),
  })
  .passthrough();

export async function POST(request: NextRequest) {
  const parsed = await parseJsonBody(request, AuditSchema);
  if (!parsed.ok) return parsed.response;

  const event = buildAuditEvent(parsed.data);
  await appendAuditEvent(event);
  return NextResponse.json({ status: "ok", event_id: event.event_id });
}
