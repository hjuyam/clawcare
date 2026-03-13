import fs from "node:fs/promises";
import path from "node:path";
import { updateRun, type RunRecord } from "./runsStore";
import { appendAuditEvent, buildAuditEvent } from "./audit";
import { executeConfigApply, executeConfigRollback } from "./configHandlers";

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

async function writeRunAudit(params: {
  run: RunRecord;
  status: "succeeded" | "failed";
  before_ref?: string | null;
  after_ref?: string | null;
  diff_summary?: string | null;
  error_code?: string | null;
  error_message?: string | null;
}) {
  const evt = buildAuditEvent({
    actor_type: "user",
    actor_id: params.run.requested_by.user_id,
    session_id: params.run.requested_by.session_id,
    action: params.run.type,
    resource_type: params.run.type.startsWith("config.") ? "config" : "runs",
    resource_id: params.run.id,
    policy_decision: "allow",
    status: params.status,
    before_ref: params.before_ref ?? null,
    after_ref: params.after_ref ?? null,
    diff_summary: params.diff_summary ?? null,
    error_code: params.error_code ?? null,
    error_message: params.error_message ?? null,
    reason: params.run.reason,
  });
  await appendAuditEvent(evt);
}

// Used by the legacy/mock timer path. For M3 config runs we execute inline above,
// so this is effectively a no-op unless we later add additional config-related run types.
async function maybeExecuteConfigRun(_run: RunRecord) {
  return null;
}

export async function scheduleMockExecution(run: RunRecord) {
  // NOTE: In serverless/edge runtimes, timers aren't guaranteed.
  // For M2 minimal loop we use best-effort mock execution.

  // M3: config.apply / config.rollback run inline (stable, no timers)
  // IMPORTANT: this must also run in test env, otherwise config semantics are never exercised.
  if (run.type === "config.apply" || run.type === "config.rollback") {
    await updateRun(run.id, {
      status: "running",
      started_at: new Date().toISOString(),
    });

    try {
      if (run.type === "config.apply") {
        const r = await executeConfigApply(run.input);
        if (!r.ok) {
          await updateRun(run.id, {
            status: "failed",
            ended_at: new Date().toISOString(),
            error: r.error,
            result: {
              mode: "inline",
              kind: "config.apply",
              before_version: (r as any).beforeVersion ?? null,
            },
          });
          await writeRunAudit({
            run,
            status: "failed",
            before_ref: (r as any).beforeVersion ?? null,
            error_code: r.error.code,
            error_message: r.error.message,
          });
          return;
        }

        await updateRun(run.id, {
          status: "succeeded",
          ended_at: new Date().toISOString(),
          result: {
            mode: "inline",
            kind: "config.apply",
            // legacy keys expected by tests/clients
            before: r.beforeVersion,
            after: r.afterVersion,
            version: r.afterVersion,
            // explicit keys
            before_version: r.beforeVersion,
            after_version: r.afterVersion,
          },
        });
        await writeRunAudit({
          run,
          status: "succeeded",
          before_ref: r.beforeVersion,
          after_ref: r.afterVersion,
        });
        return;
      }

      const r = await executeConfigRollback(run.input);
      if (!r.ok) {
        await updateRun(run.id, {
          status: "failed",
          ended_at: new Date().toISOString(),
          error: r.error,
          result: {
            mode: "inline",
            kind: "config.rollback",
            before_version: (r as any).beforeVersion ?? null,
          },
        });
        await writeRunAudit({
          run,
          status: "failed",
          before_ref: (r as any).beforeVersion ?? null,
          error_code: r.error.code,
          error_message: r.error.message,
        });
        return;
      }

      await updateRun(run.id, {
        status: "succeeded",
        ended_at: new Date().toISOString(),
        result: {
          mode: "inline",
          kind: "config.rollback",
          // legacy keys expected by tests/clients
          before: r.beforeVersion,
          after: r.afterVersion,
          version: r.afterVersion,
          // explicit keys
          before_version: r.beforeVersion,
          after_version: r.afterVersion,
          rolled_back_to: r.rolledBackTo,
        },
      });
      await writeRunAudit({
        run,
        status: "succeeded",
        before_ref: r.beforeVersion,
        after_ref: r.afterVersion,
        diff_summary: r.rolledBackTo ? `rollback->${r.rolledBackTo}` : null,
      });
      return;
    } catch (err: any) {
      await updateRun(run.id, {
        status: "failed",
        ended_at: new Date().toISOString(),
        error: { code: "EXEC_ERROR", message: String(err?.message ?? err) },
      });
      await writeRunAudit({
        run,
        status: "failed",
        error_code: "EXEC_ERROR",
        error_message: String(err?.message ?? err),
      });
      return;
    }
  }

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
      const configResult = await maybeExecuteConfigRun(run);

      await updateRun(run.id, {
        status: "succeeded",
        ended_at: new Date().toISOString(),
        result: {
          mode: "mock",
          message: "Run finished (mock executor)",
          ...(artifactPath ? { artifact_path: artifactPath } : null),
          ...(configResult ? { config: configResult } : null),
        },
      });
    } catch {
      try {
        await updateRun(run.id, {
          status: "failed",
          ended_at: new Date().toISOString(),
          error: {
            code: "EXECUTION_FAILED",
            message: "Run execution failed (mock executor)",
          },
        });
      } catch {
        // ignore
      }
    }
  }, delayMs);
}
