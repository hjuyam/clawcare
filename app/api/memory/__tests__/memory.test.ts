import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import { authCookieHeader } from "@/tests/_helpers/auth";
import { disableSafeMode, enableSafeMode } from "@/tests/_helpers/safeMode";

const memoryDir = path.join(process.cwd(), "data", "memory-test");
process.env.CLAWCARE_MEMORY_DIR = memoryDir;

async function writeMemoryFile(name: string, content: string) {
  await fs.mkdir(memoryDir, { recursive: true });
  await fs.writeFile(path.join(memoryDir, name), content, "utf8");
}

async function clearMemoryDir() {
  await fs.rm(memoryDir, { recursive: true, force: true });
}

describe("Memory API", () => {
  beforeEach(async () => {
    vi.resetModules();
    await clearMemoryDir();
    await disableSafeMode();
    await writeMemoryFile("mem-1.md", "Gateway check passed\nkey=sk-1234567890secret");
    await writeMemoryFile("mem-2.txt", "Ops cleanup scheduled");
  });

  afterEach(async () => {
    await clearMemoryDir();
    await disableSafeMode();
  });

  it("lists memory items for viewer", async () => {
    const { GET } = await import("../route");
    const headers = await authCookieHeader("viewer");
    const req = new Request("http://localhost/api/memory?limit=10", { headers });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
  });

  it("supports substring search", async () => {
    const { GET } = await import("../route");
    const headers = await authCookieHeader("viewer");
    const req = new Request("http://localhost/api/memory?q=gateway", { headers });

    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items.length).toBe(1);
    expect(data.items[0].filename).toContain("mem-1");
  });

  it("redacts secrets in detail view", async () => {
    const { GET } = await import("../[id]/route");
    const headers = await authCookieHeader("viewer");
    const req = new Request("http://localhost/api/memory/mem-1.md", { headers });

    const res = await GET(req, { params: { id: "mem-1.md" } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.item.content).not.toContain("sk-1234567890secret");
    expect(data.item.content).toContain("[REDACTED]");
  });

  it("enforces admin + confirm for delete", async () => {
    const { DELETE } = await import("../[id]/route");

    const viewerHeaders = {
      "content-type": "application/json",
      ...(await authCookieHeader("viewer")),
    };
    const viewerReq = new Request("http://localhost/api/memory/mem-1.md", {
      method: "DELETE",
      headers: viewerHeaders,
      body: JSON.stringify({ confirm: true, reason: "test" }),
    });
    const viewerRes = await DELETE(viewerReq, { params: { id: "mem-1.md" } });
    expect([401, 403]).toContain(viewerRes.status);

    const adminHeaders = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };
    const adminReq = new Request("http://localhost/api/memory/mem-1.md", {
      method: "DELETE",
      headers: adminHeaders,
      body: JSON.stringify({ reason: "test" }),
    });
    const adminRes = await DELETE(adminReq, { params: { id: "mem-1.md" } });
    const adminData = await adminRes.json();

    expect(adminRes.status).toBe(409);
    expect(adminData.error.code).toBe("CONFIRM_REQUIRED");
  });

  it("blocks delete when safe mode enabled", async () => {
    await enableSafeMode("unit-test");
    const { DELETE } = await import("../[id]/route");

    const adminHeaders = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };
    const req = new Request("http://localhost/api/memory/mem-1.md", {
      method: "DELETE",
      headers: adminHeaders,
      body: JSON.stringify({ confirm: true, reason: "test" }),
    });

    const res = await DELETE(req, { params: { id: "mem-1.md" } });
    expect([403, 409]).toContain(res.status);
  });

  it("trims memory with confirm", async () => {
    const { POST } = await import("../trim/route");
    const headers = {
      "content-type": "application/json",
      ...(await authCookieHeader("admin")),
    };

    const req = new Request("http://localhost/api/memory/trim", {
      method: "POST",
      headers,
      body: JSON.stringify({ confirm: true, reason: "cleanup", query: "Ops" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.deleted.length).toBe(1);
  });
});
