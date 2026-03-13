import { z } from "zod";
import {
  loadManifest,
  loadConfigByVersion,
  saveManifest,
  snapshotConfig,
} from "@/app/api/config/_utils";

export const ApplyInputSchema = z.object({
  config: z.record(z.unknown()),
  base_version: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export const RollbackInputSchema = z.object({
  target_version: z.string().nullable().optional(),
  snapshot_id: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
});

export async function executeConfigApply(input: unknown) {
  const parsed = ApplyInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: { code: "INVALID_INPUT", message: parsed.error.message },
    };
  }

  const manifest = await loadManifest();
  const beforeVersion = manifest.currentVersion;

  const base = parsed.data.base_version ?? null;
  if (base && base !== beforeVersion) {
    return {
      ok: false as const,
      error: {
        code: "BASE_VERSION_MISMATCH",
        message: `base_version=${base} does not match current_version=${beforeVersion}`,
      },
      beforeVersion,
    };
  }

  const snap = await snapshotConfig(parsed.data.config, manifest, {
    author: parsed.data.author ?? undefined,
    reason: parsed.data.reason ?? undefined,
  });

  return {
    ok: true as const,
    beforeVersion,
    afterVersion: snap.manifest.currentVersion,
    entry: snap.entry,
  };
}

export async function executeConfigRollback(input: unknown) {
  const parsed = RollbackInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: { code: "INVALID_INPUT", message: parsed.error.message },
    };
  }

  const manifest = await loadManifest();
  const beforeVersion = manifest.currentVersion;

  const target = parsed.data.target_version ?? null;
  if (!target) {
    return {
      ok: false as const,
      error: { code: "TARGET_REQUIRED", message: "target_version is required" },
      beforeVersion,
    };
  }

  const loaded = await loadConfigByVersion(target);
  if (!loaded) {
    return {
      ok: false as const,
      error: { code: "NOT_FOUND", message: `version ${target} not found` },
      beforeVersion,
    };
  }

  // Stable rollback semantics: switch currentVersion to an existing snapshot (no new version).
  await saveManifest({ ...manifest, currentVersion: target });

  return {
    ok: true as const,
    beforeVersion,
    afterVersion: target,
    rolledBackTo: target,
  };
}
