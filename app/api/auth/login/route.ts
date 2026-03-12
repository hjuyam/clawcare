import { z } from "zod";
import { totp } from "otplib";
import { parseJsonBody, jsonError } from "@/app/api/_lib/http";
import { createSession, issueSessionResponse, loadUsers } from "@/app/api/_lib/auth";

const LoginSchema = z
  .object({
    otp: z.string().min(4),
    user_id: z.string().optional(),
  })
  .strict();

function isDevBypassEnabled() {
  return process.env.DEV_BYPASS === "1";
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, LoginSchema);
  if (!parsed.ok) return parsed.response;

  const { otp, user_id } = parsed.data;
  const users = await loadUsers();

  const user = user_id
    ? users.find((item) => item.id === user_id)
    : users.length === 1
    ? users[0]
    : null;

  if (!user) {
    return jsonError(
      "NOT_FOUND",
      "User not found",
      parsed.requestId,
      404
    );
  }

  const devBypass = isDevBypassEnabled() && otp === "DEV-BYPASS";

  if (!devBypass) {
    if (!user.totp_secret) {
      return jsonError(
        "UNAUTHORIZED",
        "TOTP not configured",
        parsed.requestId,
        401
      );
    }

    const ok = totp.check(otp, user.totp_secret);
    if (!ok) {
      return jsonError("UNAUTHORIZED", "Invalid OTP", parsed.requestId, 401);
    }
  }

  const session = await createSession({
    user_id: user.id,
    role: user.role,
  });

  return issueSessionResponse(session);
}
