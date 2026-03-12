import fs from "node:fs/promises";
import path from "node:path";

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

const RUNS_PATH = path.join(process.cwd(), "data", "runs.json");

async function readStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(RUNS_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (parsed && Array.isArray(parsed.runs)) return { runs: parsed.runs };
  } catch (err: any) {
    if (err?.code !== "ENOENT") throw err;
  }
  return { runs: [] };
}

async function writeStore(data: StoreShape) {
  await fs.mkdir(path.dirname(RUNS_PATH), { recursive: true });
  await fs.writeFile(RUNS_PATH, JSON.stringify(data, null, 2), "utf8");
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
  return run;
}

export async function updateRun(id: string, patch: Partial<RunRecord>) {
  const store = await readStore();
  const idx = store.runs.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  store.runs[idx] = { ...store.runs[idx], ...patch };
  await writeStore(store);
  return store.runs[idx];
}
