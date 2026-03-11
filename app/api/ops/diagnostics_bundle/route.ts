import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    mode: "mock",
    generatedAt: new Date().toISOString(),
    gateway: {
      status: "degraded",
      version: "0.0.0-mock",
      uptimeSeconds: 3600,
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      arch: process.arch,
    },
    checks: {
      lastSelfCheck: "2026-03-11T16:00:00.000Z",
      warnings: ["Disk usage at 78% (mock)"],
      errors: ["Stale config detected (mock)"],
    },
    redactions: {
      user: "[redacted]",
      host: "[redacted]",
      ip: "[redacted]",
    },
  });
}
