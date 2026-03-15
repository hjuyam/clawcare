import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { parseJsonBody } from "@/app/api/_lib/http";
import { requireRole } from "@/app/api/_lib/auth";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";
import {
  createRun,
  listRuns,
  type RunRecord,
} from "@/app/api/_lib/runsStore";
import { scheduleMockExecution } from "@/app/api/_lib/runExecutor";
import { gatewayClient, GatewayError } from "@/app/api/_lib/gatewayClient";
import { gatewayRpc, gatewayWsEnabled } from "@/app/api/_lib/gatewayWsClient";

const CreateRunSchema = z
  .object({
    type: z.string().min(1),
    reason: z.string().min(3).optional(),
    input: z.record(z.unknown()).optional(),
  })
  .strict();

function isHighRiskRun(type: string) {
  // 中庸拍板：凡是会改变系统状态的 ops/config 视为高危
  return [
    "ops.restart_gateway",
    "ops.cleanup",
    "ops.diagnostics_bundle",
    "config.apply",
    "config.rollback",
  ].includes(type);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || "50");
  const auth = await requireRole(req, "viewer", {
    action: "runs.list",
    resource_type: "runs",
  });
  if (!auth.ok) return auth.response;

  const normalizedLimit = Number.isFinite(limit) ? limit : 50;

  const wsMode = process.env.CLAWCARE_GATEWAY_MODE === "ws";

  if (wsMode && gatewayWsEnabled()) {
    // WS gateway mode: map cron.runs to ClawCare runs list
    const jobs = await gatewayRpc<any>("cron.list", {});
    if (!jobs.ok) {
      return NextResponse.json(
        {
          error: {
            code: "GATEWAY_WS_CRON_LIST_FAILED",
            message: jobs.error?.message ?? "Gateway WS error",
          },
        },
        { status: 502 }
      );
    }

    const runs: any[] = [];
    const entries = jobs.payload?.jobs ?? [];
    for (const job of entries) {
      const res = await gatewayRpc<any>("cron.runs", {
        jobId: job.id,
        limit: Math.min(normalizedLimit, 5),
      });
      if (!res.ok) continue;
      for (const entry of res.payload?.entries ?? []) {
        runs.push({
          id: `${entry.jobId}:${entry.ts}`,
          type: `cron.${job.name ?? job.id}`,
          status: entry.status ?? entry.action ?? "unknown",
          created_at: new Date(entry.runAtMs ?? entry.ts ?? Date.now()).toISOString(),
          started_at: null,
          ended_at: null,
          requested_by: { user_id: "cron", role: "system", session_id: job.id },
          reason: entry.summary ? String(entry.summary).slice(0, 120) : null,
          input: { job },
          result: entry,
          error: entry.status && entry.status !== "ok" ? { code: entry.status } : null,
        });
      }
    }
    return NextResponse.json({ runs, mode: "gateway-ws" });
  }

  if (gatewayClient.isEnabled()) {
    try {
      const data = await gatewayClient.listRuns({ limit: normalizedLimit });
      // Expecting { runs: [...] } from gateway; if not, wrap defensively.
      const runs = (data as any)?.runs ?? [];
      return NextResponse.json({ ...data, runs, mode: "gateway" });
    } catch (err: any) {
      const e = err as GatewayError;
      return NextResponse.json(
        {
          error: {
            code: "GATEWAY_RUNS_LIST_FAILED",
            message: e?.message ?? String(err),
            status: e?.status ?? 500,
            details: e?.body ?? null,
          },
        },
        { status: e?.status ?? 502 }
      );
    }
  }

  const runs = await listRuns({ limit: normalizedLimit });
  return NextResponse.json({ runs, mode: "local" });
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, CreateRunSchema);
  if (!parsed.ok) return parsed.response;

  const { type, reason, input } = parsed.data;
  const requestId = parsed.requestId;

  const minRole = isHighRiskRun(type) ? "admin" : "viewer";
  const auth = await requireRole(req, minRole, {
    action: "runs.create",
    resource_type: "runs",
    requestId,
    reason: reason ?? null,
  });
  if (!auth.ok) return auth.response;

  if (isHighRiskRun(type)) {
    const safe = await enforceSafeMode({
      request: req,
      requestId,
      action: `runs.create:${type}`,
      resource_type: "runs",
      reason: reason ?? null,
      session: auth.session,
    });
    if (!safe.ok) return safe.response;
  }

  const now = new Date().toISOString();
  const run: RunRecord = {
    id: crypto.randomUUID(),
    type,
    status: "queued",
    created_at: now,
    started_at: null,
    ended_at: null,
    requested_by: {
      user_id: auth.session.user_id,
      role: auth.session.role,
      session_id: auth.session.session_id,
    },
    reason: reason ?? null,
    input: input ?? {},
    result: null,
    error: null,
  };

  // If gateway integration is enabled, we still keep the same RBAC/SafeMode guardrails here,
  // but delegate the actual execution/tracking to the Gateway.
  if (gatewayClient.isEnabled()) {
    try {
      const data = await gatewayClient.createRun({
        type,
        reason: reason ?? null,
        input: input ?? {},
      });
      return NextResponse.json({ ...data, requestId, mode: "gateway" }, { status: 201 });
    } catch (err: any) {
      const e = err as GatewayError;
      return NextResponse.json(
        {
          error: {
            code: "GATEWAY_RUNS_CREATE_FAILED",
            message: e?.message ?? String(err),
            status: e?.status ?? 500,
            details: e?.body ?? null,
          },
          requestId,
        },
        { status: e?.status ?? 502 }
      );
    }
  }

  await createRun(run);
  await scheduleMockExecution(run);

  return NextResponse.json({ run, requestId, mode: "local" }, { status: 201 });
}
