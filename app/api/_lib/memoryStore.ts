import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { appendAuditEvent, buildAuditEvent } from "./audit";

export type MemoryItem = {
  id: string;
  filename: string;
  size: number;
  updated_at: string;
  content: string;
};

export type MemoryListItem = {
  id: string;
  filename: string;
  size: number;
  updated_at: string;
  preview: string;
};

const MEMORY_DIR =
  process.env.CLAWCARE_MEMORY_DIR ??
  path.join(process.cwd(), "data", "memory");

const MAX_PREVIEW_CHARS = 200;
const MAX_CONTENT_CHARS = 20000;

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{8,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{16,}\b/g,
  /\bBearer\s+[A-Za-z0-9._=-]{8,}\b/g,
  /\btoken=[A-Za-z0-9._-]{8,}\b/gi,
  /\bsecret=[A-Za-z0-9._-]{8,}\b/gi,
];

function redactSecrets(text: string) {
  return SECRET_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, "[REDACTED]"), text);
}

function resolveMemoryPath(id: string) {
  if (!id || id.includes("\0")) return null;
  const safeId = id.replace(/\\/g, "/");
  if (safeId.includes("../") || safeId.startsWith("/")) return null;
  const fullPath = path.resolve(MEMORY_DIR, safeId);
  const base = path.resolve(MEMORY_DIR);
  if (!fullPath.startsWith(base + path.sep) && fullPath !== base) return null;
  return fullPath;
}

async function readMemoryDir() {
  try {
    const entries = await fs.readdir(MEMORY_DIR, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile());
  } catch (err: any) {
    if (err?.code === "ENOENT") return [];
    throw err;
  }
}

function buildPreview(content: string, query?: string | null) {
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (query) {
    const lower = trimmed.toLowerCase();
    const needle = query.toLowerCase();
    const idx = lower.indexOf(needle);
    if (idx >= 0) {
      const start = Math.max(0, idx - 60);
      const end = Math.min(trimmed.length, idx + needle.length + 60);
      return trimmed.slice(start, end);
    }
  }
  return trimmed.slice(0, MAX_PREVIEW_CHARS);
}

export async function listMemory(params?: {
  limit?: number;
  offset?: number;
  query?: string | null;
}) {
  const entries = await readMemoryDir();

  const items: MemoryListItem[] = [];
  const query = params?.query?.trim() || null;

  for (const entry of entries) {
    const fullPath = resolveMemoryPath(entry.name);
    if (!fullPath) continue;

    const stat = await fs.stat(fullPath);
    const raw = await fs.readFile(fullPath, "utf8").catch(() => "");
    const redacted = redactSecrets(raw);

    if (query) {
      if (!raw.toLowerCase().includes(query.toLowerCase())) continue;
    }

    const preview = buildPreview(redacted, query);

    items.push({
      id: entry.name,
      filename: entry.name,
      size: stat.size,
      updated_at: stat.mtime.toISOString(),
      preview,
    });
  }

  const sorted = items.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  const total = sorted.length;
  const limit = Math.max(1, Math.min(params?.limit ?? 50, 200));
  const offset = Math.max(0, params?.offset ?? 0);
  const page = sorted.slice(offset, offset + limit);

  return {
    items: page,
    total,
    limit,
    offset,
    next_offset: offset + limit < total ? offset + limit : null,
  };
}

export async function getMemoryItem(id: string): Promise<MemoryItem | null> {
  const fullPath = resolveMemoryPath(id);
  if (!fullPath) return null;

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) return null;

    const raw = await fs.readFile(fullPath, "utf8");
    const redacted = redactSecrets(raw);
    const content = redacted.length > MAX_CONTENT_CHARS
      ? `${redacted.slice(0, MAX_CONTENT_CHARS)}\n…(truncated)`
      : redacted;

    return {
      id,
      filename: path.basename(fullPath),
      size: stat.size,
      updated_at: stat.mtime.toISOString(),
      content,
    };
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
}

export async function deleteMemoryItem(id: string) {
  const fullPath = resolveMemoryPath(id);
  if (!fullPath) return null;
  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) return null;
    await fs.unlink(fullPath);
    return true;
  } catch (err: any) {
    if (err?.code === "ENOENT") return null;
    throw err;
  }
}

export async function trimMemory(params?: { query?: string | null; before?: string | null }) {
  const entries = await readMemoryDir();
  const deleted: string[] = [];
  const query = params?.query?.trim() || null;
  const beforeMs = params?.before ? Date.parse(params.before) : Number.NaN;

  for (const entry of entries) {
    const fullPath = resolveMemoryPath(entry.name);
    if (!fullPath) continue;
    const stat = await fs.stat(fullPath);

    if (!Number.isNaN(beforeMs) && stat.mtime.getTime() >= beforeMs) {
      continue;
    }

    const raw = await fs.readFile(fullPath, "utf8").catch(() => "");
    if (query && !raw.toLowerCase().includes(query.toLowerCase())) {
      continue;
    }

    await fs.unlink(fullPath);
    deleted.push(entry.name);
  }

  return deleted;
}

export async function appendMemoryAuditEvent(payload: Record<string, unknown>) {
  try {
    const event = buildAuditEvent(payload);
    await appendAuditEvent(event);
  } catch {
    // best-effort audit logging
  }
}

export function ensureMemoryDir() {
  return fs.mkdir(MEMORY_DIR, { recursive: true });
}

export function buildMemoryId() {
  return `mem-${crypto.randomUUID()}`;
}
