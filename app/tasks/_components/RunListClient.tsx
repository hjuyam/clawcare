"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const POLL_INTERVAL_MS = 2500;

type RunRecord = {
  id: string;
  type: string;
  status: string;
  created_at: string;
};

type RunsResponse = {
  runs?: RunRecord[];
  items?: RunRecord[];
  data?: { runs?: RunRecord[] };
  error?: any;
  mode?: string;
};

type RunListProps = {
  initialRuns: RunRecord[];
  initialError?: any;
  initialMode?: string | null;
};

function normalizeRuns(payload: RunsResponse | null): RunRecord[] {
  if (!payload) return [];
  if (Array.isArray(payload.runs)) return payload.runs;
  if (Array.isArray(payload.items)) return payload.items;
  if (payload.data && Array.isArray(payload.data.runs)) return payload.data.runs;
  return [];
}

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

export function RunListClient({ initialRuns, initialError, initialMode }: RunListProps) {
  const [runs, setRuns] = useState<RunRecord[]>(initialRuns);
  const [error, setError] = useState<string | null>(
    initialError?.message ?? null
  );
  const [mode, setMode] = useState<string | null>(initialMode ?? null);
  const [loading, setLoading] = useState(initialRuns.length === 0 && !initialError);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const res = await fetch("/api/runs?limit=50", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as RunsResponse | null;
        if (!active) return;
        if (!res.ok) {
          const msg = json?.error?.message
            ? String(json.error.message)
            : json
              ? `HTTP ${res.status}`
              : "Failed to load runs.";
          setError(msg);
          setMode(json?.mode ?? null);
          return;
        }
        setRuns(normalizeRuns(json));
        setMode(json?.mode ?? null);
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
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      {mode ? (
        <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          数据来源：{mode === "gateway" ? "OpenClaw Gateway" : "本地存储"}
        </div>
      ) : null}
      <table className="w-full text-left text-sm" data-testid="runs-table">
        <thead className="bg-neutral-50 text-neutral-700">
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-3 py-3 text-neutral-600" colSpan={4}>
                Loading runs…
              </td>
            </tr>
          ) : runs.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-neutral-600" colSpan={4}>
                暂无运行记录。可通过 Ops 页面触发动作，或调用 `POST /api/runs` 创建。
              </td>
            </tr>
          ) : (
            runs.map((r) => (
              <tr
                key={r.id}
                className="border-t border-neutral-200"
                data-testid="run-row"
                data-run-id={r.id}
              >
                <td className="px-3 py-2 font-mono">
                  <Link
                    className="underline"
                    href={`/tasks/${r.id}`}
                    data-testid={`run-link-${r.id}`}
                  >
                    {String(r.id).slice(0, 8)}…
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono">{r.type}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {error ? (
        <div className="border-t border-neutral-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
