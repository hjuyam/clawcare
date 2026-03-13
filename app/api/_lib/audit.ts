import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type AuditEvent = {
  event_id: string;
  event_time: string;
  actor_type: string | null;
  actor_id: string | null;
  actor_ip: string | null;
  session_id: string | null;

  action: string | null;
  resource_type: string | null;
  resource_id: string | null;
  environment: string | null;

  request_id: string | null;
  trace_id: string | null;
  policy_decision: string | null;
  policy_reason: string | null;
  risk_level: string | null;

  before_ref: string | null;
  after_ref: string | null;
  diff_summary: string | null;

  status: string | null;
  error_code: string | null;
  error_message: string | null;
  duration_ms: number | null;

  reason: string | null;
};

const SENSITIVE_KEY_NEEDLES = ["token", "apikey", "api_key", "password"];

function toStringOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v;
  return null;
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function redactSensitive(input: unknown): unknown {
  if (Array.isArray(input)) return input.map((item) => redactSensitive(item));
  if (input && typeof input === "object") {
    return Object.entries(input as Record<string, unknown>).reduce(
      (acc, [key, value]) => {
        const lower = key.toLowerCase();
        acc[key] = SENSITIVE_KEY_NEEDLES.some((needle) => lower.includes(needle))
          ? "***"
          : redactSensitive(value);
        return acc;
      },
      {} as Record<string, unknown>
    );
  }
  return input;
}

export function buildAuditEvent(payload: unknown): AuditEvent {
  const redacted = (redactSensitive(payload) ?? {}) as Record<string, unknown>;

  return {
    event_id:
      typeof redacted.event_id === "string" && redacted.event_id
        ? redacted.event_id
        : randomUUID(),
    event_time:
      typeof redacted.event_time === "string" && redacted.event_time
        ? redacted.event_time
        : new Date().toISOString(),

    actor_type: toStringOrNull(redacted.actor_type),
    actor_id: toStringOrNull(redacted.actor_id),
    actor_ip: toStringOrNull(redacted.actor_ip),
    session_id: toStringOrNull(redacted.session_id),

    action: toStringOrNull(redacted.action),
    resource_type: toStringOrNull(redacted.resource_type),
    resource_id: toStringOrNull(redacted.resource_id),
    environment: toStringOrNull(redacted.environment),

    request_id: toStringOrNull(redacted.request_id),
    trace_id: toStringOrNull(redacted.trace_id),
    policy_decision: toStringOrNull(redacted.policy_decision),
    policy_reason: toStringOrNull(redacted.policy_reason),
    risk_level: toStringOrNull(redacted.risk_level),

    before_ref: toStringOrNull(redacted.before_ref),
    after_ref: toStringOrNull(redacted.after_ref),
    diff_summary: toStringOrNull(redacted.diff_summary),

    status: toStringOrNull(redacted.status),
    error_code: toStringOrNull(redacted.error_code),
    error_message: toStringOrNull(redacted.error_message),
    duration_ms: toNumberOrNull(redacted.duration_ms),

    reason: toStringOrNull(redacted.reason),
  };
}

const AUDIT_LOG_PATH = path.join(process.cwd(), "data", "audit", "events.jsonl");

export async function appendAuditEvent(event: AuditEvent): Promise<void> {
  await fs.mkdir(path.dirname(AUDIT_LOG_PATH), { recursive: true });
  await fs.appendFile(AUDIT_LOG_PATH, `${JSON.stringify(event)}\n`, "utf8");
}

export async function readAuditEvents(filters: {
  action?: string | null;
  resource_type?: string | null;
  actor?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  limit?: number | null;
}) {
  try {
    const data = await fs.readFile(AUDIT_LOG_PATH, "utf8");
    const events = data
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    const startMs = filters.start_time
      ? Date.parse(filters.start_time)
      : Number.NaN;
    const endMs = filters.end_time ? Date.parse(filters.end_time) : Number.NaN;

    const filtered = events.filter((event) => {
      if (filters.action && event.action !== filters.action) return false;
      if (filters.resource_type && event.resource_type !== filters.resource_type)
        return false;
      if (filters.actor) {
        const actor = String(filters.actor);
        if (event.actor_id !== actor && event.actor_type !== actor) return false;
      }
      if (!Number.isNaN(startMs) || !Number.isNaN(endMs)) {
        const eventMs = Date.parse(event.event_time);
        if (!Number.isNaN(startMs) && eventMs < startMs) return false;
        if (!Number.isNaN(endMs) && eventMs > endMs) return false;
      }
      return true;
    });

    const sorted = filtered.sort((a, b) => {
      const aMs = Date.parse(a.event_time);
      const bMs = Date.parse(b.event_time);
      if (Number.isNaN(aMs) || Number.isNaN(bMs)) return 0;
      return bMs - aMs;
    });

    const limit = filters.limit && filters.limit > 0 ? filters.limit : null;
    return limit ? sorted.slice(0, limit) : sorted;
  } catch (err: any) {
    if (err?.code === "ENOENT") return [];
    throw err;
  }
}
