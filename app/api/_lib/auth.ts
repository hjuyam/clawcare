import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server.js";
import { buildRequestId, jsonError } from "./http";
import { recordPolicyDeny, type PolicySession } from "./policy";

export type Role = "admin" | "operator" | "viewer";

export type Session = {
  session_id: string;
  user_id: string;
  role: Role;
  created_at: string;
  expires_at: string;
};

type UserRecord = {
  id: string;
  role: Role;
  totp_secret: string;
};

const ROLE_ORDER: Role[] = ["viewer", "operator", "admin"];
const SESSION_COOKIE = "clawcare_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const SESSION_STORE_PATH = path.join(process.cwd(), "data", "sessions.json");
const USERS_PATH = path.join(process.cwd(), "data", "users.json");

function getSessionSecret() {
  return process.env.SESSION_SECRET || "dev-session-secret";
}

function signSessionId(sessionId: string) {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(sessionId)
    .digest("hex");
}

function parseCookieHeader(header: string | null) {
  if (!header) return {} as Record<string, string>;
  return header.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {} as Record<string, string>);
}

function buildSessionCookieValue(sessionId: string) {
  const signature = signSessionId(sessionId);
  return `${sessionId}.${signature}`;
}

function serializeCookie(name: string, value: string, options: {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  return parts.join("; ");
}

async function readSessionStore(): Promise<{ sessions: Session[] }> {
  try {
    const raw = await fs.readFile(SESSION_STORE_PATH, "utf8");
    if (!raw.trim()) return { sessions: [] };

    // Best-effort: avoid crashing if the file is partially written.
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sessions)) {
        return { sessions: parsed.sessions };
      }
    } catch {
      return { sessions: [] };
    }
  } catch (err: any) {
    if (err?.code !== "ENOENT") throw err;
  }
  return { sessions: [] };
}

async function writeSessionStore(data: { sessions: Session[] }) {
  await fs.mkdir(path.dirname(SESSION_STORE_PATH), { recursive: true });
  const json = JSON.stringify(data, null, 2);

  // Atomic-ish write to prevent corruption when multiple tests write concurrently.
  const tmpPath = `${SESSION_STORE_PATH}.tmp.${process.pid}`;
  await fs.writeFile(tmpPath, json, "utf8");
  await fs.rename(tmpPath, SESSION_STORE_PATH);
}

export async function loadUsers(): Promise<UserRecord[]> {
  try {
    const raw = await fs.readFile(USERS_PATH, "utf8");
    const parsed = JSON.parse(raw) as { users?: UserRecord[] };
    if (parsed?.users?.length) return parsed.users;
  } catch (err: any) {
    if (err?.code !== "ENOENT") throw err;
  }

  const fallbackSecret = process.env.TOTP_SECRET || "";
  const fallbackRole = (process.env.AUTH_ROLE || "admin") as Role;
  return [
    {
      id: process.env.AUTH_USER_ID || "local-admin",
      role: fallbackRole,
      totp_secret: fallbackSecret,
    },
  ];
}

export function isRoleAtLeast(role: Role, minRole: Role) {
  return ROLE_ORDER.indexOf(role) >= ROLE_ORDER.indexOf(minRole);
}

export async function createSession(params: {
  user_id: string;
  role: Role;
}) {
  const now = Date.now();
  const session: Session = {
    session_id: crypto.randomUUID(),
    user_id: params.user_id,
    role: params.role,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + SESSION_TTL_MS).toISOString(),
  };
  const store = await readSessionStore();
  store.sessions = store.sessions.filter(
    (item) => item.user_id !== params.user_id
  );
  store.sessions.push(session);
  await writeSessionStore(store);
  return session;
}

export async function deleteSession(sessionId: string) {
  const store = await readSessionStore();
  store.sessions = store.sessions.filter((item) => item.session_id !== sessionId);
  await writeSessionStore(store);
}

export function buildSessionCookie(sessionId: string) {
  const secure = process.env.NODE_ENV === "production";
  return serializeCookie(SESSION_COOKIE, buildSessionCookieValue(sessionId), {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie() {
  return serializeCookie(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(request: Request): Promise<Session | null> {
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const raw = cookies[SESSION_COOKIE];
  if (!raw) return null;
  const [sessionId, signature] = raw.split(".");
  if (!sessionId || !signature) return null;
  if (signSessionId(sessionId) !== signature) return null;

  const store = await readSessionStore();
  const session = store.sessions.find((item) => item.session_id === sessionId);
  if (!session) return null;

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await deleteSession(session.session_id);
    return null;
  }

  return session;
}

export async function requireRole(
  request: Request,
  minRole: Role,
  opts?: {
    action?: string;
    resource_type?: string;
    reason?: string | null;
    requestId?: string;
    sessionOverride?: Session | null;
  }
) {
  const requestId = opts?.requestId ?? buildRequestId();
  const session =
    opts?.sessionOverride !== undefined
      ? opts.sessionOverride
      : await getSession(request);

  if (!session) {
    if (opts?.action) {
      await recordPolicyDeny({
        request,
        requestId,
        action: opts.action,
        resource_type: opts.resource_type ?? null,
        reason: opts.reason ?? null,
        policy_reason: "unauthenticated",
        session: null,
      });
    }
    return {
      ok: false as const,
      response: jsonError(
        "UNAUTHORIZED",
        "Authentication required",
        requestId,
        401
      ),
    };
  }

  if (!isRoleAtLeast(session.role, minRole)) {
    if (opts?.action) {
      await recordPolicyDeny({
        request,
        requestId,
        action: opts.action,
        resource_type: opts.resource_type ?? null,
        reason: opts.reason ?? null,
        policy_reason: `role ${session.role} lacks ${minRole}`,
        session: session as PolicySession,
      });
    }
    return {
      ok: false as const,
      response: jsonError(
        "FORBIDDEN",
        "Insufficient role",
        requestId,
        403
      ),
    };
  }

  return { ok: true as const, session };
}

export function issueSessionResponse(session: Session) {
  const response = NextResponse.json({
    ok: true,
    role: session.role,
    user_id: session.user_id,
  });
  response.headers.append("Set-Cookie", buildSessionCookie(session.session_id));
  return response;
}
