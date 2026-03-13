import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/app/api/_lib/auth";
import { parseJsonBody, jsonError } from "@/app/api/_lib/http";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";
import {
  deleteMemoryItem,
  getMemoryItem,
  appendMemoryAuditEvent,
} from "@/app/api/_lib/memoryStore";

const DeleteSchema = z
  .object({
    confirm: z.boolean().optional(),
    reason: z.string().min(3).optional(),
  })
  .strict();

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(req, "viewer", {
    action: "memory.get",
    resource_type: "memory",
  });
  if (!auth.ok) return auth.response;

  const item = await getMemoryItem(params.id);
  if (!item) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Memory item not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ item });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const parsed = await parseJsonBody(req, DeleteSchema);
  if (!parsed.ok) return parsed.response;

  const requestId = parsed.requestId;
  const { confirm, reason } = parsed.data;

  const auth = await requireRole(req, "admin", {
    action: "memory.delete",
    resource_type: "memory",
    requestId,
    reason: reason ?? null,
  });
  if (!auth.ok) return auth.response;

  if (!confirm) {
    return jsonError(
      "CONFIRM_REQUIRED",
      "Delete requires confirm=true",
      requestId,
      409
    );
  }

  const safe = await enforceSafeMode({
    request: req,
    requestId,
    action: "memory.delete",
    resource_type: "memory",
    reason: reason ?? null,
    session: auth.session,
    confirm: confirm ?? false,
  });
  if (!safe.ok) return safe.response;

  const deleted = await deleteMemoryItem(params.id);
  if (!deleted) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Memory item not found" } },
      { status: 404 }
    );
  }

  await appendMemoryAuditEvent({
    action: "memory.delete",
    resource_type: "memory",
    resource_id: params.id,
    actor_type: "user",
    actor_id: auth.session.user_id,
    session_id: auth.session.session_id,
    status: "ok",
    reason: reason ?? null,
    request_id: requestId,
  });

  return NextResponse.json({ status: "ok", requestId });
}
