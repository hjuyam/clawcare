import { NextResponse } from "next/server";
import { requireRole } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/http";
import { getRun, updateRun } from "@/app/api/_lib/runsStore";
import { gatewayClient } from "@/app/api/_lib/openclawClient"; from "@/app/api/_lib/runsStore";

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

  
  if (run.status === "queued" || run.status === "running") {
    try {
      const gwStatus = await gatewayClient.getRunStatus(run.id);
      if (gwStatus && gwStatus.status && gwStatus.status !== run.status) {
        await updateRun(run.id, { status: gwStatus.status, result: gwStatus.result });
        run.status = gwStatus.status;
        run.result = gwStatus.result || run.result;
      }
    } catch (err) {
      console.error("Failed to sync run status with gateway:", err);
    }
  }

  return NextResponse.json({ run });
}
