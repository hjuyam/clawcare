import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "../_utils";

const CleanupSchema = z
  .object({
    dryRun: z.boolean().optional(),
    confirm: z.boolean().optional(),
  })
  .strict();

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, CleanupSchema);
  if (!parsed.ok) return parsed.response;

  const dryRun = parsed.data.confirm ? false : parsed.data.dryRun ?? true;

  const preview = {
    caches: ["gateway-temp", "ops-snapshots"],
    files: ["/var/log/gateway/mock-old.log"],
    reclaimedMb: 128,
  };

  return NextResponse.json({
    mode: "mock",
    status: dryRun ? "preview" : "executed",
    dryRun,
    preview,
    timestamp: new Date().toISOString(),
  });
}
