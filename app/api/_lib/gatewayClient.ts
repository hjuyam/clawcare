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
  const raw = process.env.CLAWCARE_GATEWAY_BASE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

function getAuthHeader(): string | null {
  const token = process.env.CLAWCARE_GATEWAY_AUTH_TOKEN?.trim();
  if (!token) return null;
  // Accept both raw token and "Bearer xxx"
  return token.toLowerCase().startsWith("bearer ") ? token : `Bearer ${token}`;
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

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    // avoid cached responses for runs listing
    cache: "no-store",
  });

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
};
