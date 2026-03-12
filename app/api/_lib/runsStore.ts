import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { appendAuditEvent, buildAuditEvent } from "./audit";

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "denied";

export type RunRecord = {
  id: string;
  type: string;
  status: RunStatus;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  requested_by: {
    user_id: string;
    role: string;
    session_id: string;
  };
  reason: string | null;
  input: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: { code: string; message: string } | null;
};

type StoreShape = { runs: RunRecord[] };

const RUNS_PATH =
  process.env.CLAWCARE_RUNS_PATH ??
  path.join(process.cwd(), "data", "runs.json");

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(RUNS_PATH, "utf8");
    if (!raw.trim()) return { runs: [] };

    // NOTE: local dev can end up with a partially-written file if the process
    // is killed mid-write or if multiple workers write concurrently.
    // We treat parse errors as "empty store" (best-effort) instead of crashing.
    try {
      const parsed = JSON.parse(raw) as StoreShape;
      if (parsed && Array.isArray(parsed.runs)) return { runs: parsed.runs };
    } catch {
      return { runs: [] };
    }
  } catch (err: any) {
    if (err?.code !== "ENOENT") throw err;
  }
  return { runs: [] };
}

async function writeStore(data: StoreShape) {
  await fs.mkdir(path.dirname(RUNS_PATH), { recursive: true });
  const json = JSON.stringify(data, null, 2);

  // Atomic-ish write: write to a temp file then rename.
  // Prevents file corruption from partial writes.
  const tmpPath = `${RUNS_PATH}.tmp.${process.pid}.${crypto.randomUUID()}`;
  await fs.writeFile(tmpPath, json, "utf8");
  await fs.rename(tmpPath, RUNS_PATH);
}

async function appendRunAuditEvent(payload: Record<string, unknown>) {
  try {
    const event = buildAuditEvent(payload);
    await appendAuditEvent(event);
  } catch {
    // best-effort audit logging
  }
}

export async function listRuns(params?: { limit?: number }) {
  const store = await readStore();
  const runs = [...store.runs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const limit = params?.limit ?? 50;
  return runs.slice(0, limit);
}

export async function getRun(id: string) {
  const store = await readStore();
  return store.runs.find((r) => r.id === id) ?? null;
}

export async function createRun(run: RunRecord) {
  const store = await readStore();
  store.runs.push(run);
  await writeStore(store);

  await appendRunAuditEvent({
    action: "runs.create",
    resource_type: "runs",
    resource_id: run.id,
    actor_type: "user",
    actor_id: run.requested_by?.user_id ?? null,
    session_id: run.requested_by?.session_id ?? null,
    status: "ok",
    reason: run.reason ?? null,
    diff_summary: `type=${run.type}`,
  });

  return run;
}

export async function updateRun(id: string, patch: Partial<RunRecord>) {
  const store = await readStore();
  const idx = store.runs.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const before = store.runs[idx];
  store.runs[idx] = { ...store.runs[idx], ...patch };
  const updated = store.runs[idx];
  await writeStore(store);

  const changedKeys = Object.keys(patch).join(", ") || "unknown";
  const statusSummary =
    patch.status && before.status !== patch.status
      ? `status ${before.status} → ${patch.status}`
      : null;

  await appendRunAuditEvent({
    action: "runs.update",
    resource_type: "runs",
    resource_id: id,
    actor_type: "system",
    actor_id: "run-executor",
    status: "ok",
    before_ref: before.status,
    after_ref: updated.status,
    diff_summary: [statusSummary, `fields: ${changedKeys}`]
      .filter(Boolean)
      .join("; "),
  });

  return updated;
}
