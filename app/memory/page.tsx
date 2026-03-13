import Link from "next/link";
import { cookies } from "next/headers";
import { PageShell } from "@/app/_components/PageShell";
import { getBaseUrl } from "@/app/_lib/baseUrl";

type MemoryListItem = {
  id: string;
  filename: string;
  size: number;
  updated_at: string;
  preview: string;
};

type MemoryListResponse = {
  items: MemoryListItem[];
  total: number;
  limit: number;
  offset: number;
  next_offset: number | null;
};

async function fetchMemoryList(params: {
  q?: string;
  offset?: number;
  limit?: number;
}) {
  const url = new URL(`${getBaseUrl()}/api/memory`);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.offset) url.searchParams.set("offset", String(params.offset));
  if (params.limit) url.searchParams.set("limit", String(params.limit));

  const cookieHeader = cookies().toString();
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  if (!res.ok) {
    return {
      items: [],
      total: 0,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      next_offset: null,
    } as MemoryListResponse;
  }
  return (await res.json()) as MemoryListResponse;
}

export default async function MemoryPage({
  searchParams,
}: {
  searchParams?: { q?: string; offset?: string };
}) {
  const q = searchParams?.q?.trim() || "";
  const offset = Number(searchParams?.offset || "0");
  const data = await fetchMemoryList({ q, offset, limit: 20 });
  const prevOffset = Math.max(0, data.offset - data.limit);

  return (
    <PageShell title="Memory" subtitle="只读浏览/搜索，敏感内容会自动脱敏。">
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <form className="mb-4 flex gap-2" method="GET">
          <input
            className="flex-1 rounded-md border border-neutral-200 px-3 py-2 text-sm"
            name="q"
            placeholder="搜索关键字"
            defaultValue={q}
          />
          <button
            className="rounded-md border border-neutral-200 px-3 py-2 text-sm font-medium"
            type="submit"
          >
            搜索
          </button>
        </form>

        <div className="mb-3 text-xs text-neutral-600">
          共 {data.total} 条记忆，展示 {data.items.length} 条
        </div>

        <div className="overflow-hidden rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-700">
              <tr>
                <th className="px-3 py-2">文件</th>
                <th className="px-3 py-2">更新时间</th>
                <th className="px-3 py-2">预览</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-neutral-600" colSpan={3}>
                    暂无记忆文件。可以在 data/memory 下新增 .md/.txt 文件。
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="border-t border-neutral-200">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link className="underline" href={`/memory/${encodeURIComponent(item.id)}`}>
                        {item.filename}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-600">
                      {item.updated_at}
                    </td>
                    <td className="px-3 py-2 text-xs text-neutral-700">
                      {item.preview || "(empty)"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link
            className={`underline ${data.offset === 0 ? "pointer-events-none text-neutral-400" : ""}`}
            href={`/memory?q=${encodeURIComponent(q)}&offset=${prevOffset}`}
          >
            上一页
          </Link>
          <Link
            className={`underline ${data.next_offset === null ? "pointer-events-none text-neutral-400" : ""}`}
            href={`/memory?q=${encodeURIComponent(q)}&offset=${data.next_offset ?? data.offset}`}
          >
            下一页
          </Link>
        </div>

        <div className="mt-4 text-xs text-neutral-500">
          删除/清理操作仅 admin 且需 confirm，并会被 Safe Mode 阻断。
        </div>
      </div>
    </PageShell>
  );
}
