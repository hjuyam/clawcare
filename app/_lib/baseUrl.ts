import { headers } from "next/headers";

export function getBaseUrl() {
  // In dev, Next sets host headers; in prod behind proxy, x-forwarded-* should exist.
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";
  return `${proto}://${host}`;
}
