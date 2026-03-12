import fs from "node:fs/promises";
import path from "node:path";
import { updateRun, type RunRecord } from "./runsStore";

function isTestEnv() {
  return process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
}

async function maybeWriteDiagnosticsArtifact(run: RunRecord) {
  if (run.type !== "ops.diagnostics_bundle") return null;

  const dir = path.join(process.cwd(), "data", "artifacts");
  const filename = `diagnostics_bundle_${run.id}.json`;
  const filePath = path.join(dir, filename);
  const payload = {
    run_id: run.id,
    generated_at: new Date().toISOString(),
    summary: "Mock diagnostics bundle",
    checks: ["gateway.connectivity", "disk.usage", "memory.stats"],
  };

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  return filePath;
}

export async function scheduleMockExecution(run: RunRecord) {
  // NOTE: In serverless/edge runtimes, timers aren't guaranteed.
  // For M2 minimal loop we use best-effort mock execution.
  // In unit tests, avoid background timers that can outlive the test and cause unhandled rejections.
  if (isTestEnv()) return;

  const delayMs = 400;

  setTimeout(async () => {
    try {
      await updateRun(run.id, {
        status: "running",
        started_at: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  }, 10);

  setTimeout(async () => {
    try {
      const artifactPath = await maybeWriteDiagnosticsArtifact(run).catch(() => null);
      await updateRun(run.id, {
        status: "succeeded",
        ended_at: new Date().toISOString(),
        result: {
          mode: "mock",
          message: "Run finished (mock executor)",
          ...(artifactPath ? { artifact_path: artifactPath } : null),
        },
      });
    } catch {
      // ignore
    }
  }, delayMs);
}
