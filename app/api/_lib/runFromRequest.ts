import crypto from "node:crypto";
import { type Session } from "./auth";
import { createRun, updateRun, type RunRecord } from "./runsStore";
import { scheduleMockExecution } from "./runExecutor";

export async function createAndScheduleRun(params: {
  type: string;
  session: Session;
  reason: string | null;
  input?: Record<string, unknown>;
}) {
  const now = new Date().toISOString();

  const run: RunRecord = {
    id: crypto.randomUUID(),
    type: params.type,
    status: "queued",
    created_at: now,
    started_at: null,
    ended_at: null,
    requested_by: {
      user_id: params.session.user_id,
      role: params.session.role,
      session_id: params.session.session_id,
    },
    reason: params.reason ?? null,
    input: params.input ?? {},
    result: null,
    error: null,
  };

  await createRun(run);
  await scheduleMockExecution(run);

  return run;
}

export async function createCompletedRun(params: {
  type: string;
  session: Session;
  reason: string | null;
  input?: Record<string, unknown>;
  result: Record<string, unknown>;
}) {
  const now = new Date().toISOString();

  const run: RunRecord = {
    id: crypto.randomUUID(),
    type: params.type,
    status: "running",
    created_at: now,
    started_at: now,
    ended_at: null,
    requested_by: {
      user_id: params.session.user_id,
      role: params.session.role,
      session_id: params.session.session_id,
    },
    reason: params.reason ?? null,
    input: params.input ?? {},
    result: null,
    error: null,
  };

  await createRun(run);
  const completed = await updateRun(run.id, {
    status: "succeeded",
    ended_at: new Date().toISOString(),
    result: params.result,
  });

  return completed ?? run;
}
