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

  // TODO: Implement GET /config
  async getConfig() {
    // return fetch(`${this.baseUrl}/config`, { headers: this.headers });
  }

  // TODO: Implement POST /runs
  async submitRun(payload: any) {
    // return fetch(`${this.baseUrl}/runs`, { method: 'POST', body: JSON.stringify(payload), headers: this.headers });
  }
}

export const gatewayClient = new OpenClawClient();
