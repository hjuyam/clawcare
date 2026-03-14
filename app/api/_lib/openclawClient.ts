/**
 * Real OpenClaw Gateway Integration Client
 * Handles communication with the local or remote OpenClaw Gateway API.
 */
export class OpenClawClient {
  private baseUrl: string;
  private token: string | undefined;

  constructor() {
    this.baseUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:18789';
    this.token = process.env.OPENCLAW_GATEWAY_TOKEN;
  }

  private get headers() {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  async getHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { headers: this.headers, signal: AbortSignal.timeout(2000) });
      return { ok: res.ok, status: res.status };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async getConfig() {
    const res = await fetch(`${this.baseUrl}/config`, { headers: this.headers });
    if (!res.ok) throw new Error(`Gateway GET /config failed: ${res.statusText}`);
    return res.json();
  }

  async putConfig(payload: any) {
    const res = await fetch(`${this.baseUrl}/config`, { 
      method: 'PUT', 
      body: JSON.stringify(payload), 
      headers: this.headers 
    });
    if (!res.ok) throw new Error(`Gateway PUT /config failed: ${res.statusText}`);
    return res.json();
  }

  async getRunStatus(id: string) {
    const res = await fetch(`${this.baseUrl}/runs/${id}`, { headers: this.headers });
    if (!res.ok) throw new Error(`Gateway GET /runs/${id} failed: ${res.statusText}`);
    return res.json();
  }

  async submitRun(payload: any) {
    const res = await fetch(`${this.baseUrl}/runs`, { 
      method: 'POST', 
      body: JSON.stringify(payload), 
      headers: this.headers 
    });
    if (!res.ok) throw new Error(`Gateway POST /runs failed: ${res.statusText}`);
    return res.json();
  }
}

export const gatewayClient = new OpenClawClient();
