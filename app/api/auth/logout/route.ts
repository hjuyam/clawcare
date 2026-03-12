import { NextResponse } from "next/server";
import { clearSessionCookie, getSession, deleteSession } from "@/app/api/_lib/auth";

export async function POST(request: Request) {
  const session = await getSession(request);
  if (session) {
    await deleteSession(session.session_id);
  }

  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", clearSessionCookie());
  return response;
}
