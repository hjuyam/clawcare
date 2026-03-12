import { buildAuditEvent, appendAuditEvent } from "./audit";

export type PolicySession = {
  user_id: string;
  session_id: string;
  role: string;
};

function getActorIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

export async function recordPolicyDeny(params: {
  request: Request;
  requestId: string;
  action: string;
  resource_type?: string | null;
  reason?: string | null;
  policy_reason: string;
  session?: PolicySession | null;
}) {
  const { request, requestId, action, resource_type, reason, policy_reason, session } =
    params;

  const event = buildAuditEvent({
    action,
    resource_type: resource_type ?? null,
    reason: reason ?? null,
    status: "rejected",
    policy_decision: "deny",
    policy_reason,
    actor_type: session ? "user" : "anonymous",
    actor_id: session?.user_id ?? null,
    session_id: session?.session_id ?? null,
    actor_ip: getActorIp(request),
    request_id: requestId,
  });

  await appendAuditEvent(event);
}
