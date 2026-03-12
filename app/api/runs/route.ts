import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { jsonError, parseJsonBody } from "@/app/api/_lib/http";
import { requireRole } from "@/app/api/_lib/auth";
import { enforceSafeMode } from "@/app/api/_lib/safeMode";
import { createRun, listRuns, updateRun, type RunRecord } from "@/app/api/_lib/runsStore";

const CreateRunSchema = z
  .object({
    type: z.string().min(1),
    reason: z.string().min(3).optional(),
    input: z.record(z.unknown()).optional(),
  })
  .strict();

function isHighRiskRun(type: string) {
  // 中庸拍板：凡是会改变系统状态的 ops 视为高危
  return [
    "ops.restart_gateway",
    "ops.cleanup",
    "ops.diagnostics_bundle",
    "config.apply",
    "config.rollback",
  ].includes(type);
}

async function scheduleMockExecution(run: RunRecord) {
  // 注意：Next 在某些部署模式下不保证长生命周期。
  // M2 最小闭环阶段先用 best-effort 模拟；上线版再接真实执行器/队列。
  const delayMs = 400;
  setTimeout(async () => {
    await updateRun(run.id, {
      status: "running",
      started_at: new Date().toISOString(),
    });
  }, 10);

  setTimeout(async () => {
    await updateRun(run.id, {
      status: "succeeded",
      ended_at: new Date().toISOString(),
      result: {
        mode: "mock",
        message: "Run finished (mock executor)",
      },
    });
  }, delayMs);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || "50");
  const auth = await requireRole(req, "viewer", {
    action: "runs.list",
    resource_type: "runs",
  });
  if (!auth.ok) return auth.response;

  const runs = await listRuns({ limit: Number.isFinite(limit) ? limit : 50 });
  return NextResponse.json({ runs });
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

  await createRun(run);
  await scheduleMockExecution(run);

  return NextResponse.json({ run, requestId }, { status: 201 });
}
