"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const DEFAULT_LIMIT = 200;

type AuditEvent = {
  event_id: string;
  event_time: string;
  actor_type: string | null;
  actor_id: string | null;
  action: string | null;
  resource_type: string | null;
  resource_id: string | null;
  policy_decision: string | null;
  policy_reason: string | null;
  status: string | null;
  reason: string | null;
};

type AuditResponse = {
  items: AuditEvent[];
};

function toInputDate(value: string | null) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 16);
}

function toIso(value: string) {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString();
}

export function AuditLogClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [action, setAction] = useState(searchParams.get("action") ?? "");
  const [actor, setActor] = useState(searchParams.get("actor") ?? "");
  const [start, setStart] = useState(toInputDate(searchParams.get("start")));
  const [end, setEnd] = useState(toInputDate(searchParams.get("end")));

  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (action.trim()) params.set("action", action.trim());
    if (actor.trim()) params.set("actor", actor.trim());
    const startIso = toIso(start);
    const endIso = toIso(end);
    if (startIso) params.set("start", startIso);
    if (endIso) params.set("end", endIso);
    params.set("limit", String(DEFAULT_LIMIT));
    return params.toString();
  }, [action, actor, start, end]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/audit?${queryString}`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as AuditResponse | null;
      if (!res.ok) {
        setError(json ? `HTTP ${res.status}` : "Failed to load audit events.");
        setEvents([]);
        return;
      }
      setEvents(json?.items ?? []);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  const onApply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (action.trim()) params.set("action", action.trim());
    if (actor.trim()) params.set("actor", actor.trim());
    const startIso = toIso(start);
    const endIso = toIso(end);
    if (startIso) params.set("start", startIso);
    if (endIso) params.set("end", endIso);
    router.replace(`/security?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <form
        className="rounded-xl border border-neutral-200 bg-white p-4"
        onSubmit={onApply}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs font-medium text-neutral-600">
            Action
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-2 py-1 text-sm"
              placeholder="ops.cleanup"
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-neutral-600">
            Actor
            <input
              className="mt-1 w-full rounded-md border border-neutral-200 px-2 py-1 text-sm"
              placeholder="user-1 / anonymous"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-neutral-600">
            Start
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-neutral-200 px-2 py-1 text-sm"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-neutral-600">
            End
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-neutral-200 px-2 py-1 text-sm"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
          <div>只读审计视图（RBAC 可见性：viewer+）</div>
          <button
            type="submit"
            className="rounded-md border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-700"
          >
            Apply filters
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-600">
          {loading
            ? "Loading audit events…"
            : `Showing ${events.length} event(s)`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" data-testid="audit-table">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2">Time (UTC)</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Resource</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Policy</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-3 text-neutral-500" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-neutral-500" colSpan={6}>
                    No audit events found for this filter set.
                  </td>
                </tr>
              ) : (
                events.map((event) => {
                  const actorLabel =
                    event.actor_id || event.actor_type || "(unknown)";
                  const resourceLabel =
                    event.resource_type && event.resource_id
                      ? `${event.resource_type}:${event.resource_id}`
                      : event.resource_type || "-";
                  const runLink =
                    event.resource_type === "runs" && event.resource_id;
                  return (
                    <tr
                      key={event.event_id}
                      className="border-t border-neutral-100"
                      data-testid="audit-row"
                      data-action={event.action ?? ""}
                      data-resource-id={event.resource_id ?? ""}
                    >
                      <td className="px-3 py-2 font-mono text-xs">
                        {event.event_time}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {event.action ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-xs">{actorLabel}</td>
                      <td className="px-3 py-2 text-xs">
                        {runLink ? (
                          <Link
                            className="underline"
                            href={`/tasks/${event.resource_id}`}
                          >
                            {resourceLabel}
                          </Link>
                        ) : (
                          resourceLabel
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {event.status ?? "-"}
                        {event.reason ? (
                          <div className="mt-1 text-[11px] text-neutral-500">
                            {event.reason}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {event.policy_decision ?? "-"}
                        {event.policy_reason ? (
                          <div className="mt-1 text-[11px] text-neutral-500">
                            {event.policy_reason}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {error ? (
          <div className="border-t border-neutral-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
