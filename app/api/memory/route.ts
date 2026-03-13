import { NextResponse } from "next/server";
import { requireRole } from "@/app/api/_lib/auth";
import { listMemory } from "@/app/api/_lib/memoryStore";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || "50");
  const offset = Number(url.searchParams.get("offset") || "0");
  const query = url.searchParams.get("q");

  const auth = await requireRole(req, "viewer", {
    action: "memory.list",
    resource_type: "memory",
  });
  if (!auth.ok) return auth.response;

  const result = await listMemory({
    limit: Number.isFinite(limit) ? limit : 50,
    offset: Number.isFinite(offset) ? offset : 0,
    query,
  });

  return NextResponse.json(result);
}
