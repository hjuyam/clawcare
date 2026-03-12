import { updateRun, type RunRecord } from "./runsStore";

function isTestEnv() {
  return process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
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
      await updateRun(run.id, {
        status: "succeeded",
        ended_at: new Date().toISOString(),
        result: {
          mode: "mock",
          message: "Run finished (mock executor)",
        },
      });
    } catch {
      // ignore
    }
  }, delayMs);
}
