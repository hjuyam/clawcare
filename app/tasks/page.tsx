import Link from "next/link";
import { PageShell } from "@/app/_components/PageShell";
import { getBaseUrl } from "@/app/_lib/baseUrl";
import { RunListClient } from "@/app/tasks/_components/RunListClient";

async function fetchRuns() {
  const res = await fetch(`${getBaseUrl()}/api/runs?limit=50`, {
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    return {
      runs: [] as any[],
      error: json?.error ?? { message: `HTTP ${res.status}` },
      mode: json?.mode ?? null,
    };
  }
  return json as { runs: any[]; error?: any; mode?: string };
}

export default async function TasksPage() {
  const data = await fetchRuns();

  return (
    <PageShell title="Tasks & Runs" subtitle="统一 Runs/Tasks 入口 + 运行历史 + 单次运行详情。">
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-neutral-700">最近运行（最多 50 条）</div>
          <Link
            className="text-sm font-medium text-neutral-900 underline"
            href="/ops"
          >
            去 Ops 页面触发动作（M2 起会统一走 runs）
          </Link>
        </div>

        <RunListClient
          initialRuns={data.runs ?? []}
          initialError={data.error ?? null}
          initialMode={data.mode ?? null}
        />
      </div>
    </PageShell>
  );
}
