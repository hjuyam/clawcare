import { NextResponse } from "next/server";
import { gatewayClient } from "@/app/api/_lib/openclawClient";

export async function GET() {
  const gateway = await gatewayClient.getHealth();
  return NextResponse.json({ status: "ok", service: "clawcare", gateway });
}
