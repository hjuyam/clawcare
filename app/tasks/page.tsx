import Link from "next/link";
import { PageShell } from "@/app/_components/PageShell";

async function fetchRuns() {
  const res = await fetch("http://localhost:3000/api/runs?limit=50", {
    cache: "no-store",
  });
  if (!res.ok) return { runs: [] as any[] };
  return (await res.json()) as { runs: any[] };
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

        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.runs.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-neutral-600" colSpan={4}>
                    暂无运行记录。你可以先调用 `POST /api/runs` 创建一个 mock run。
                  </td>
                </tr>
              ) : (
                data.runs.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-200">
                    <td className="px-3 py-2 font-mono">
                      <Link className="underline" href={`/tasks/${r.id}`}>
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
        </div>
      </div>
    </PageShell>
  );
}
