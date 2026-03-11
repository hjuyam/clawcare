import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseJsonBody } from "../_utils";

const RestartSchema = z
  .object({
    reason: z.string().min(3, "Reason is required"),
    confirm: z.boolean().optional(),
  })
  .strict();

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, RestartSchema);
  if (!parsed.ok) return parsed.response;

  const { reason, confirm } = parsed.data;
  if (!confirm) {
    return errorResponse(
      "CONFIRM_REQUIRED",
      "Restart requires confirm=true",
      parsed.requestId,
      409,
    );
  }

  return NextResponse.json({
    status: "queued",
    mode: "mock",
    reason,
    requestedAt: new Date().toISOString(),
  });
}
