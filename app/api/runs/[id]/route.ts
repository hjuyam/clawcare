import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { requireRole } from "@/app/api/_lib/auth";
import { jsonError } from "@/app/api/_lib/http";
import { getRun } from "@/app/api/_lib/runsStore";
import { gatewayClient, GatewayError } from "@/app/api/_lib/gatewayClient";
import { gatewayRpc, gatewayWsEnabled } from "@/app/api/_lib/gatewayWsClient";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const auth = await requireRole(req, "viewer", {
    action: "runs.get",
    resource_type: "runs",
  });
  if (!auth.ok) return auth.response;

  const wsMode = process.env.CLAWCARE_GATEWAY_MODE === "ws";

  if (wsMode && gatewayWsEnabled()) {
    const [jobId, ts] = ctx.params.id.split(":");
    if (!jobId || !ts) {
      return jsonError("NOT_FOUND", "Run not found", crypto.randomUUID(), 404);
    }
    const res = await gatewayRpc<any>("cron.runs", { jobId, limit: 50 });
    if (!res.ok) {
      return NextResponse.json(
        {
          error: {
            code: "GATEWAY_WS_RUN_GET_FAILED",
            message: res.error?.message ?? "Gateway WS error",
          },
        },
        { status: 502 }
      );
    }
    const entry = (res.payload?.entries ?? []).find((e: any) => String(e.ts) === ts);
    if (!entry) {
      return jsonError("NOT_FOUND", "Run not found", crypto.randomUUID(), 404);
    }
    const run = {
      id: `${entry.jobId}:${entry.ts}`,
      type: `cron.${entry.jobId}`,
      status: entry.status ?? entry.action ?? "unknown",
      created_at: new Date(entry.runAtMs ?? entry.ts ?? Date.now()).toISOString(),
      started_at: null,
      ended_at: null,
      requested_by: { user_id: "cron", role: "system", session_id: entry.jobId },
      reason: entry.summary ? String(entry.summary).slice(0, 120) : null,
      input: { jobId },
      result: entry,
      error: entry.status && entry.status !== "ok" ? { code: entry.status } : null,
    };
    return NextResponse.json({ run, mode: "gateway-ws" });
  }

  if (gatewayClient.isEnabled()) {
    try {
      const data = await gatewayClient.getRun(ctx.params.id);
      if (data && typeof data === "object") {
        return NextResponse.json({ ...(data as Record<string, unknown>), mode: "gateway" });
      }
      return NextResponse.json({ data, mode: "gateway" });
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
