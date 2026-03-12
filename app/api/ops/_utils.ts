import { buildRequestId, jsonError, parseJsonBody } from "@/app/api/_lib/http";

export { buildRequestId, parseJsonBody };

export function errorResponse(
  code: string,
  message: string,
  requestId: string,
  status = 400,
) {
  return jsonError(code, message, requestId, status);
}
