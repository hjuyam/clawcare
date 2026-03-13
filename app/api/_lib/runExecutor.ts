import fs from "node:fs/promises";
import path from "node:path";
import { updateRun, type RunRecord } from "./runsStore";
import {
  loadManifest,
  saveManifest,
  snapshotConfig,
  type Manifest,
} from "@/app/api/config/_utils";
import { appendAuditEvent, buildAuditEvent } from "./audit";

function isTestEnv() {
  return process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
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

async function writeAuditEvent(payload: Record<string, unknown>) {
  try {
    const event = buildAuditEvent(payload);
    await appendAuditEvent(event);
  } catch {
    // best-effort
  }
}

async function executeConfigApply(run: RunRecord) {
  const input = run.input ?? {};
  const config =
    typeof input.config === "object" && input.config
      ? (input.config as Record<string, unknown>)
      : {};
  const baseVersion = toStringOrNull(input.base_version);
  const author = toStringOrNull(input.author) ?? undefined;
  const reason = toStringOrNull(input.reason) ?? undefined;

  const manifest = await loadManifest();
  if (baseVersion && baseVersion !== manifest.currentVersion) {
    return {
      ok: false as const,
      error: {
        code: "BASE_VERSION_MISMATCH",
        message: `Expected base_version ${manifest.currentVersion}, got ${baseVersion}`,
      },
      result: {
        before: manifest.currentVersion,
        after: manifest.currentVersion,
        version: manifest.currentVersion,
      },
    };
  }

  const before = manifest.currentVersion;
  const { manifest: updated, entry } = await snapshotConfig(config, manifest, {
    author,
    reason,
  });

  await writeAuditEvent({
    action: "config.apply",
    resource_type: "config",
    resource_id: entry.version,
    actor_type: "user",
    actor_id: run.requested_by?.user_id ?? null,
    session_id: run.requested_by?.session_id ?? null,
    status: "ok",
    reason: reason ?? run.reason ?? null,
    before_ref: before,
    after_ref: updated.currentVersion,
    diff_summary: `apply ${before} -> ${updated.currentVersion}`,
  });

  return {
    ok: true as const,
    result: {
      before,
      after: updated.currentVersion,
      version: entry.version,
      entry,
    },
  };
}

async function executeConfigRollback(run: RunRecord) {
  const input = run.input ?? {};
  const target =
    toStringOrNull(input.target_version) ?? toStringOrNull(input.snapshot_id);
  const author = toStringOrNull(input.author) ?? undefined;
  const reason = toStringOrNull(input.reason) ?? undefined;

  if (!target) {
    return {
      ok: false as const,
      error: {
        code: "TARGET_VERSION_REQUIRED",
        message: "target_version is required",
      },
    };
  }

  const manifest = await loadManifest();
  const entry = manifest.entries.find((item) => item.version === target);
  if (!entry) {
    return {
      ok: false as const,
      error: {
        code: "TARGET_VERSION_NOT_FOUND",
        message: `Unknown target_version ${target}`,
      },
    };
  }

  const before = manifest.currentVersion;
  const updated: Manifest = {
    currentVersion: target,
    entries: manifest.entries,
  };
  await saveManifest(updated);

  await writeAuditEvent({
    action: "config.rollback",
    resource_type: "config",
    resource_id: target,
    actor_type: "user",
    actor_id: run.requested_by?.user_id ?? null,
    session_id: run.requested_by?.session_id ?? null,
    status: "ok",
    reason: reason ?? run.reason ?? null,
    before_ref: before,
    after_ref: target,
    diff_summary: author
      ? `rollback ${before} -> ${target} (author=${author})`
      : `rollback ${before} -> ${target}`,
  });

  return {
    ok: true as const,
    result: {
      before,
      after: target,
      version: target,
      entry,
    },
  };
}

async function executeMockRun(run: RunRecord) {
  if (!isTestEnv()) {
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  const artifactPath = await maybeWriteDiagnosticsArtifact(run).catch(() => null);
  return {
    ok: true as const,
    result: {
      mode: "mock",
      message: "Run finished (mock executor)",
      ...(artifactPath ? { artifact_path: artifactPath } : null),
    },
  };
}

async function executeRun(run: RunRecord) {
  await updateRun(run.id, {
    status: "running",
    started_at: new Date().toISOString(),
  });

  const execution =
    run.type === "config.apply"
      ? await executeConfigApply(run)
      : run.type === "config.rollback"
        ? await executeConfigRollback(run)
        : await executeMockRun(run);

  if (!execution.ok) {
    await updateRun(run.id, {
      status: "failed",
      ended_at: new Date().toISOString(),
      result: execution.result ?? null,
      error: execution.error,
    });
    return;
  }

  await updateRun(run.id, {
    status: "succeeded",
    ended_at: new Date().toISOString(),
    result: execution.result,
  });
}

export async function scheduleMockExecution(run: RunRecord) {
  // NOTE: In serverless/edge runtimes, timers aren't guaranteed.
  // For M2 minimal loop we use best-effort mock execution.
  // In unit tests, avoid background timers that can outlive the test and cause unhandled rejections.
  if (isTestEnv()) {
    await executeRun(run);
    return;
  }

  setTimeout(() => {
    void executeRun(run).catch(() => {
      // ignore
    });
  }, 10);
}
