type Json = Record<string, any>;

export class GatewayError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = "GatewayError";
    this.status = status;
    this.body = body;
  }
}

export function getGatewayBaseUrl(): string | null {
  const raw =
    process.env.CLAWCARE_GATEWAY_BASE_URL?.trim() ??
    process.env.OPENCLAW_GATEWAY_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

function normalizeBasePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") return "";
  return "/" + trimmed.replace(/^\/+/, "").replace(/\/+$/, "");
}

export function getGatewayBasePath(): string {
  const raw = process.env.CLAWCARE_GATEWAY_BASE_PATH?.trim();
  return raw ? normalizeBasePath(raw) : "";
}

function getAuthHeader(): string | null {
  const token =
    process.env.CLAWCARE_GATEWAY_AUTH_TOKEN?.trim() ??
    process.env.OPENCLAW_GATEWAY_TOKEN?.trim();
  if (!token) return null;
  // Accept both raw token and "Bearer xxx"
  return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
}

let cachedBasePath: string | null = null;
let detectingBasePath: Promise<string> | null = null;

async function detectGatewayBasePath(base: string) {
  const candidates = ["", "/api", "/v1", "/gateway", "/oc/api"];
  const headers = new Headers();
  headers.set("accept", "application/json");
  const auth = getAuthHeader();
  if (auth) headers.set("authorization", auth);

  for (const prefix of candidates) {
    const url = `${base}${prefix}/runs?limit=1`;
    try {
      const res = await fetch(url, { method: "GET", headers, cache: "no-store" });
      if (res.status !== 404) {
        return prefix;
      }
    } catch {
      // ignore and continue
    }
  }
  return "";
}

function isTestEnv() {
  return process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
}

async function resolveGatewayBasePath(base: string) {
  const envPath = getGatewayBasePath();
  if (envPath) return envPath;
  if (isTestEnv()) return "";
  if (cachedBasePath !== null) return cachedBasePath;
  if (!detectingBasePath) {
    detectingBasePath = detectGatewayBasePath(base).then((path) => {
      cachedBasePath = path;
      detectingBasePath = null;
      return path;
    });
  }
  return detectingBasePath;
}

async function gwFetch(path: string, init: RequestInit = {}) {
  const base = getGatewayBaseUrl();
  if (!base) throw new GatewayError("Gateway base URL not configured", 500, null);

  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const auth = getAuthHeader();
  if (auth) headers.set("authorization", auth);

  let res: Response;
  try {
    const prefix = await resolveGatewayBasePath(base);
    res = await fetch(`${base}${prefix}${path}`, {
      ...init,
      headers,
      // avoid cached responses for runs listing
      cache: "no-store",
    });
  } catch (err: any) {
    throw new GatewayError(
      `Gateway request failed: ${err?.message ?? String(err)}`,
      502,
      null
    );
  }

  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!res.ok) {
    throw new GatewayError(
      `Gateway request failed: ${res.status} ${res.statusText}`,
      res.status,
      body
    );
  }

  return body as Json;
}

export const gatewayClient = {
  isEnabled() {
    return Boolean(getGatewayBaseUrl());
  },

  async capabilities() {
    return gwFetch("/capabilities", { method: "GET" });
  },

  async listRuns(params?: { limit?: number }) {
    const qs = new URLSearchParams();
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return gwFetch(`/runs${suffix}`, { method: "GET" });
  },

  async createRun(payload: { type: string; reason?: string | null; input?: any }) {
    return gwFetch("/runs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getRun(id: string) {
    return gwFetch(`/runs/${encodeURIComponent(id)}`, { method: "GET" });
  },

  async getConfig() {
    return gwFetch("/config", { method: "GET" });
  },

  async putConfig(payload: any) {
    return gwFetch("/config", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async listConfigVersions() {
    return gwFetch("/config/versions", { method: "GET" });
  },

  async previewConfigDiff(payload: any) {
    return gwFetch("/config/preview_diff", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async rollbackConfig(payload: any) {
    return gwFetch("/config/rollback", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
