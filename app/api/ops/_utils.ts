import { NextResponse } from "next/server";
import { z } from "zod";

export function buildRequestId() {
  return crypto.randomUUID();
}

export function errorResponse(
  code: string,
  message: string,
  requestId: string,
  status = 400,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        requestId,
      },
    },
    { status },
  );
}

export async function parseJsonBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T,
) {
  const requestId = buildRequestId();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return {
      ok: false as const,
      response: errorResponse(
        "INVALID_JSON",
        "Request body must be valid JSON",
        requestId,
        400,
      ),
    };
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    return {
      ok: false as const,
      response: errorResponse(
        "VALIDATION_ERROR",
        result.error.issues.map((issue) => issue.message).join("; "),
        requestId,
        400,
      ),
    };
  }

  return { ok: true as const, data: result.data, requestId };
}
