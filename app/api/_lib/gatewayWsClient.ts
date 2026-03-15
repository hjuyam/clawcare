import crypto from "node:crypto";

export type GatewayRpcResponse<T> = {
  ok: boolean;
  payload?: T;
  error?: any;
};

const DEFAULT_SCOPES = ["operator.read", "operator.write", "operator.admin"];

function getGatewayWsUrl(): string | null {
  const raw =
    process.env.CLAWCARE_GATEWAY_WS_URL?.trim() ??
    process.env.OPENCLAW_GATEWAY_WS_URL?.trim();
  if (raw) return raw;

  const base =
    process.env.CLAWCARE_GATEWAY_BASE_URL?.trim() ??
    process.env.OPENCLAW_GATEWAY_URL?.trim();
  if (!base) return null;
  // derive ws url from http base
  const url = new URL(base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString().replace(/\/+$/, "");
}

function getAuthToken(): string | null {
  return (
    process.env.CLAWCARE_GATEWAY_AUTH_TOKEN?.trim() ??
    process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ??
    null
  );
}

function getScopes(): string[] {
  const raw = process.env.CLAWCARE_GATEWAY_SCOPES?.trim();
  if (!raw) return DEFAULT_SCOPES;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function nextId() {
  return crypto.randomUUID();
}

async function connect(ws: WebSocket) {
  const token = getAuthToken();
  if (!token) throw new Error("Gateway token not configured");

  return await new Promise<void>((resolve, reject) => {
    let challenged = false;
    const timeout = setTimeout(() => {
      reject(new Error("Gateway connect challenge timeout"));
      try { ws.close(); } catch {}
    }, 5000);

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(String(evt.data ?? ""));
        if (data?.type === "event" && data?.event === "connect.challenge") {
          challenged = true;
          const reqId = nextId();
          const payload = {
            type: "req",
            id: reqId,
            method: "connect",
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              role: "operator",
              scopes: getScopes(),
              caps: [],
              commands: [],
              permissions: {},
              auth: { token },
              client: {
                id: "clawcare",
                version: "0.1.0",
                platform: "server",
                mode: "operator",
              },
            },
          };
          ws.send(JSON.stringify(payload));
          return;
        }
        if (data?.type === "res" && data?.payload?.type === "hello-ok") {
          clearTimeout(timeout);
          resolve();
        }
        if (data?.type === "res" && data?.ok === false && challenged) {
          clearTimeout(timeout);
          reject(new Error(data?.error?.message ?? "Gateway connect failed"));
        }
      } catch (err) {
        // ignore parse errors here
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      reject(new Error("Gateway WS error"));
    };
  });
}

export async function gatewayRpc<T>(method: string, params: any): Promise<GatewayRpcResponse<T>> {
  const url = getGatewayWsUrl();
  if (!url) {
    return { ok: false, error: { message: "Gateway WS URL not configured" } };
  }

  const ws = new WebSocket(url);

  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error("Gateway WS open error"));
  });

  await connect(ws);

  return await new Promise<GatewayRpcResponse<T>>((resolve) => {
    const reqId = nextId();
    const timeout = setTimeout(() => {
      try { ws.close(); } catch {}
      resolve({ ok: false, error: { message: "Gateway RPC timeout" } });
    }, 8000);

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(String(evt.data ?? ""));
        if (data?.type === "res" && data?.id === reqId) {
          clearTimeout(timeout);
          try { ws.close(); } catch {}
          if (data.ok) {
            resolve({ ok: true, payload: data.payload });
          } else {
            resolve({ ok: false, error: data.error });
          }
        }
      } catch {
        // ignore
      }
    };

    ws.send(
      JSON.stringify({
        type: "req",
        id: reqId,
        method,
        params,
      })
    );
  });
}

export function gatewayWsEnabled() {
  return Boolean(getGatewayWsUrl());
}
