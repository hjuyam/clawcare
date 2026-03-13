import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/app/api/_lib/auth";
import { jsonError, parseJsonBody } from "@/app/api/_lib/http";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";
import { appendMemoryAuditEvent, trimMemory } from "@/app/api/_lib/memoryStore";

const TrimSchema = z
  .object({
    confirm: z.boolean().optional(),
    reason: z.string().min(3).optional(),
    query: z.string().optional(),
    before: z.string().optional(),
  })
  .strict();

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, TrimSchema);
  if (!parsed.ok) return parsed.response;

  const requestId = parsed.requestId;
  const { confirm, reason, query, before } = parsed.data;

  const auth = await requireRole(req, "admin", {
    action: "memory.trim",
    resource_type: "memory",
    requestId,
    reason: reason ?? null,
  });
  if (!auth.ok) return auth.response;

  if (!confirm) {
    return jsonError(
      "CONFIRM_REQUIRED",
      "Trim requires confirm=true",
      requestId,
      409
    );
  }

  const safe = await enforceSafeMode({
    request: req,
    requestId,
    action: "memory.trim",
    resource_type: "memory",
    reason: reason ?? null,
    session: auth.session,
    confirm: confirm ?? false,
  });
  if (!safe.ok) return safe.response;

  const deleted = await trimMemory({ query, before });

  await appendMemoryAuditEvent({
    action: "memory.trim",
    resource_type: "memory",
    resource_id: null,
    actor_type: "user",
    actor_id: auth.session.user_id,
    session_id: auth.session.session_id,
    status: "ok",
    reason: reason ?? null,
    request_id: requestId,
    diff_summary: `deleted=${deleted.length}`,
  });

  return NextResponse.json({ status: "ok", deleted, requestId });
}
