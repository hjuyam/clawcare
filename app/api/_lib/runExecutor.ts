import { updateRun, type RunRecord } from "./runsStore";

export async function scheduleMockExecution(run: RunRecord) {
  // NOTE: In serverless/edge runtimes, timers aren't guaranteed.
  // For M2 minimal loop we use best-effort mock execution.
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
