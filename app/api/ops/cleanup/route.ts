import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "../_utils";

const CleanupSchema = z
  .object({
    dry_run: z.boolean().optional(),
    dryRun: z.boolean().optional(),
    confirm: z.boolean().optional(),
    reason: z.string().optional(),
  })
  .strict();

async function emitAudit(request: Request, payload: Record<string, unknown>) {
  // Best-effort: unit tests call handlers with synthetic request.url (may not be reachable).
  try {
    const auditUrl = new URL("/api/audit/log", request.url);
    await fetch(auditUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const parsed = await parseJsonBody(req, CleanupSchema);
  if (!parsed.ok) return parsed.response;

  const dryRun = parsed.data.confirm
    ? false
    : parsed.data.dry_run ?? parsed.data.dryRun ?? true;

  const preview = {
    caches: ["gateway-temp", "ops-snapshots"],
    files: ["/var/log/gateway/mock-old.log"],
    reclaimedMb: 128,
  };

  const status = dryRun ? "preview" : "executed";

  await emitAudit(req, {
    action: "ops.cleanup",
    resource_type: "ops",
    reason: parsed.data.reason ?? null,
    status,
    duration_ms: Date.now() - startedAt,
    request_id: parsed.requestId,
  });

  return NextResponse.json({
    mode: "mock",
    status,
    dry_run: dryRun,
    preview,
    timestamp: new Date().toISOString(),
  });
}
