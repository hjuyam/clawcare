import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export type ManifestEntry = {
  version: string;
  hash: string;
  time: string;
  author?: string;
  reason?: string;
  file: string;
};

export type Manifest = {
  currentVersion: string;
  entries: ManifestEntry[];
};

const dataDir = path.join(process.cwd(), "data");
const snapshotsDir = path.join(dataDir, "snapshots");
const manifestPath = path.join(dataDir, "manifest.json");

export async function ensureStorage() {
  await fs.mkdir(snapshotsDir, { recursive: true });
}

export function hashConfig(config: unknown) {
  const json = JSON.stringify(config, null, 2);
  return crypto.createHash("sha256").update(json).digest("hex");
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

export async function writeJsonFile(filePath: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, json, "utf8");
}

export async function initIfMissing() {
  await ensureStorage();
  try {
    await fs.access(manifestPath);
  } catch {
    const initialConfig = {};
    const version = "v1";
    const time = new Date().toISOString();
    const hash = hashConfig(initialConfig);
    const file = `${version}.json`;
    await writeJsonFile(path.join(snapshotsDir, file), initialConfig);
    const manifest: Manifest = {
      currentVersion: version,
      entries: [
        {
          version,
          hash,
          time,
          author: "system",
          reason: "init",
          file,
        },
      ],
    };
    await writeJsonFile(manifestPath, manifest);
  }
}

export async function loadManifest(): Promise<Manifest> {
  await initIfMissing();
  return readJsonFile<Manifest>(manifestPath);
}

export async function saveManifest(manifest: Manifest) {
  await writeJsonFile(manifestPath, manifest);
}

export async function loadConfigByVersion(version: string) {
  const manifest = await loadManifest();
  const entry = manifest.entries.find((e) => e.version === version);
  if (!entry) return null;
  const filePath = path.join(snapshotsDir, entry.file);
  const config = await readJsonFile<Record<string, unknown>>(filePath);
  return { config, entry };
}

export function nextVersion(manifest: Manifest) {
  const latestNumber = manifest.entries.length;
  return `v${latestNumber + 1}`;
}

export async function snapshotConfig(
  config: Record<string, unknown>,
  manifest: Manifest,
  meta?: { author?: string; reason?: string }
) {
  const version = nextVersion(manifest);
  const time = new Date().toISOString();
  const hash = hashConfig(config);
  const file = `${version}.json`;
  await writeJsonFile(path.join(snapshotsDir, file), config);
  const entry: ManifestEntry = {
    version,
    hash,
    time,
    author: meta?.author,
    reason: meta?.reason,
    file,
  };
  const updated: Manifest = {
    currentVersion: version,
    entries: [...manifest.entries, entry],
  };
  await saveManifest(updated);
  return { manifest: updated, entry };
}

const sensitiveKeys = new Set(["apikey", "token", "password"]);

export function maskSensitive(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map((item) => maskSensitive(item));
  }
  if (input && typeof input === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        result[key] = "***";
      } else {
        result[key] = maskSensitive(value);
      }
    }
    return result;
  }
  return input;
}
