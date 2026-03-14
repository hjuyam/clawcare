import { NextResponse } from "next/server";
import { requireRole } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/http";
import { getRun } from "@/app/api/_lib/runsStore";


  // Adapter for Gateway /api/process output
  function parseGatewayStatus(gwData: any): { status: string, result?: string } {
    if (!gwData || !gwData.sessionId) return { status: "failed", result: "Invalid gateway response" };
    // Assuming gateway process returns code/exitCode for finished processes
    if (gwData.exitCode !== undefined) {
      return { 
        status: gwData.exitCode === 0 ? "succeeded" : "failed",
        result: gwData.output || "No output"
      };
    }
    return { status: "running", result: gwData.output || "Running..." };
  }

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
