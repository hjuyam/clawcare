import { NextResponse } from "next/server";
import { gatewayClient, GatewayError } from "@/app/api/_lib/gatewayClient";

export async function GET() {
  if (gatewayClient.isEnabled()) {
    try {
      const data = await gatewayClient.capabilities();
      return NextResponse.json(data);
    } catch (err: any) {
      const e = err as GatewayError;
      return NextResponse.json(
        {
          error: {
            code: "GATEWAY_CAPABILITIES_FAILED",
            message: e?.message ?? String(err),
            status: e?.status ?? 500,
            details: e?.body ?? null,
          },
        },
        { status: e?.status ?? 502 }
      );
    }
  }

  return NextResponse.json({
    capabilities: [],
    message: "Placeholder capabilities (set CLAWCARE_GATEWAY_BASE_URL to enable)" ,
  });
}
