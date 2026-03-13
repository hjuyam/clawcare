import fs from "node:fs/promises";
import path from "node:path";
import { jsonError } from "./http";
import { recordPolicyDeny, type PolicySession } from "./policy";

export type SafeModeState = {
  enabled: boolean;
  reason?: string;
  updated_at?: string;
};

const SAFE_MODE_PATH = path.join(process.cwd(), "data", "safe_mode.json");

export async function readSafeMode(): Promise<SafeModeState> {
  try {
    const raw = await fs.readFile(SAFE_MODE_PATH, "utf8");
    const parsed = JSON.parse(raw) as SafeModeState;
    if (typeof parsed.enabled === "boolean") return parsed;
  } catch (err: any) {
    if (err?.code !== "ENOENT") throw err;
  }
  return { enabled: false };
}

export function isActionBlockedBySafeMode(action: string, confirm?: boolean) {
  if (action === "ops.cleanup") return Boolean(confirm);
  return [
    "ops.restart_gateway",
    "config.apply",
    "config.rollback",
    "memory.delete",
    "memory.trim",
  ].includes(action);
}

export async function enforceSafeMode(params: {
  request: Request;
  requestId: string;
  action: string;
  resource_type?: string | null;
  reason?: string | null;
  confirm?: boolean;
  session?: PolicySession | null;
  safeModeOverride?: SafeModeState | null;
}) {
  const safeMode =
    params.safeModeOverride ?? (await readSafeMode());

  if (!safeMode.enabled) {
    return { ok: true as const };
  }

  if (!isActionBlockedBySafeMode(params.action, params.confirm)) {
    return { ok: true as const };
  }

  const policyReason = safeMode.reason
    ? `safe_mode: ${safeMode.reason}`
    : "safe_mode enabled";

  await recordPolicyDeny({
    request: params.request,
    requestId: params.requestId,
    action: params.action,
    resource_type: params.resource_type ?? null,
    reason: params.reason ?? null,
    policy_reason: policyReason,
    session: params.session ?? null,
  });

  return {
    ok: false as const,
    response: jsonError("POLICY_DENIED", "Safe mode enabled", params.requestId, 403),
  };
}
