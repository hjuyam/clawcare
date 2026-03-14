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

type RunsResponse = { runs: RunRecord[] };

export function RunListClient({ initialRuns }: { initialRuns: RunRecord[] }) {
  const [runs, setRuns] = useState<RunRecord[]>(initialRuns);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialRuns.length === 0);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        const res = await fetch("/api/runs?limit=50", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as RunsResponse | null;
        if (!active) return;
        if (!res.ok) {
          setError(json ? `HTTP ${res.status}` : "Failed to load runs.");
          return;
        }
        setRuns(json?.runs ?? []);
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
                暂无运行记录。你可以先调用 `POST /api/runs` 创建一个 mock run。
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
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.created_at}</td>
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
