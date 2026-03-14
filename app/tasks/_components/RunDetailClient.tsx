"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 2000;

type RunRecord = {
  id: string;
  type: string;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  requested_by?: { user_id?: string; role?: string; session_id?: string } | null;
  reason?: string | null;
  input?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  error?: { code?: string; message?: string } | null;
};

type RunResponse = { run: RunRecord };

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "succeeded"
      ? "bg-green-100 text-green-800"
      : status === "failed"
        ? "bg-red-100 text-red-800"
        : status === "running"
          ? "bg-blue-100 text-blue-800"
          : status === "denied"
            ? "bg-amber-100 text-amber-800"
            : "bg-neutral-100 text-neutral-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

export function RunDetailClient({ initialRunId, initialRun }: { initialRunId: string; initialRun: RunRecord | null }) {
  const [run, setRun] = useState<RunRecord | null>(initialRun);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialRun);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const res = await fetch(`/api/runs/${initialRunId}`, { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as RunResponse | null;
        if (!active) return;
        if (!res.ok) {
          setError(json ? `HTTP ${res.status}` : "Failed to load run.");
          return;
        }
        setRun(json?.run ?? null);
        setError(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    timer = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [initialRunId]);

  if (loading && !run) {
    return <div className="text-neutral-700">Loading run…</div>;
  }

  if (!run) {
    return <div className="text-neutral-700">Run not found.</div>;
  }

  const artifactPath =
    run.result && typeof run.result === "object"
      ? (run.result as Record<string, unknown>).artifact_path
      : null;

  return (
    <div className="space-y-4 text-sm" data-testid="run-detail">
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs text-neutral-500">Run ID</div>
            <div
              className="font-mono text-sm text-neutral-900"
              data-testid="run-detail-id"
            >
              {run.id}
            </div>
          </div>
          <StatusBadge status={run.status} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs text-neutral-500">Type</div>
            <div className="font-mono text-sm text-neutral-900">{run.type}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Requested By</div>
            <div className="text-sm text-neutral-900">
              {run.requested_by?.user_id ?? "-"}
              {run.requested_by?.role ? ` (${run.requested_by.role})` : ""}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Created</div>
            <div className="text-sm text-neutral-900">{run.created_at}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Started</div>
            <div className="text-sm text-neutral-900">{run.started_at ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Ended</div>
            <div className="text-sm text-neutral-900">{run.ended_at ?? "-"}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Reason</div>
            <div className="text-sm text-neutral-900">{run.reason ?? "-"}</div>
          </div>
        </div>
      </div>

      {run.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <div className="text-xs font-semibold">Error</div>
          <div className="mt-1 text-sm">
            {run.error.code ? `${run.error.code}: ` : ""}
            {run.error.message ?? "Unknown error"}
          </div>
        </div>
      ) : null}

      {run.result ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="text-xs font-semibold text-neutral-700">Result</div>
          {artifactPath ? (
            <div className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs">
              Artifact: <span className="font-mono">{String(artifactPath)}</span>
            </div>
          ) : null}
          <pre className="mt-3 overflow-auto rounded-lg bg-neutral-50 p-4 text-xs">
            {JSON.stringify(run.result, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="text-xs font-semibold text-neutral-700">Input</div>
        <pre className="mt-3 overflow-auto rounded-lg bg-neutral-50 p-4 text-xs">
          {JSON.stringify(run.input ?? {}, null, 2)}
        </pre>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
