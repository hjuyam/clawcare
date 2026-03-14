import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireRole } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/http";
import { getRun } from "@/app/api/_lib/runsStore";
import { gatewayClient, GatewayError } from "@/app/api/_lib/gatewayClient";


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

  if (gatewayClient.isEnabled()) {
    try {
      const data = await gatewayClient.getRun(ctx.params.id);
      return NextResponse.json(data);
    } catch (err: any) {
      const e = err as GatewayError;
      return NextResponse.json(
        {
          error: {
            code: "GATEWAY_RUN_GET_FAILED",
            message: e?.message ?? String(err),
            status: e?.status ?? 500,
            details: e?.body ?? null,
          },
        },
        { status: e?.status ?? 502 }
      );
    }
  }

  const run = await getRun(ctx.params.id);
  if (!run) {
    return jsonError("NOT_FOUND", "Run not found", crypto.randomUUID(), 404);
  }

  return NextResponse.json({ run, mode: "local" });
}
