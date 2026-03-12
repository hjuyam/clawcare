import { NextResponse } from "next/server";
import { requireRole } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/http";
import { getRun } from "@/app/api/_lib/runsStore";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const auth = await requireRole(req, "viewer", {
    action: "runs.get",
    resource_type: "runs",
  });
  if (!auth.ok) return auth.response;

  const run = await getRun(ctx.params.id);
  if (!run) {
    return jsonError("NOT_FOUND", "Run not found", crypto.randomUUID(), 404);
  }

  return NextResponse.json({ run });
}
