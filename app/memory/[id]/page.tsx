import Link from "next/link";
import { cookies } from "next/headers";
import { PageShell } from "@/app/_components/PageShell";
import { getBaseUrl } from "@/app/_lib/baseUrl";

type MemoryItem = {
  id: string;
  filename: string;
  size: number;
  updated_at: string;
  content: string;
};

async function fetchMemory(id: string) {
  const cookieHeader = cookies().toString();
  const res = await fetch(`${getBaseUrl()}/api/memory/${encodeURIComponent(id)}`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { item: MemoryItem };
  return data.item;
}

export default async function MemoryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const item = await fetchMemory(params.id);

  return (
    <PageShell title="Memory Detail" subtitle={params.id}>
      <div className="mb-4 text-sm">
        <Link className="underline" href="/memory">
          ← 返回列表
        </Link>
      </div>

      {!item ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
          未找到该记忆条目。
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-3 text-sm text-neutral-600">{item.filename}</div>
          <div className="mb-4 text-xs text-neutral-500">
            updated: {item.updated_at} • size: {item.size} bytes
          </div>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-800">
            {item.content}
          </pre>
        </div>
      )}
    </PageShell>
  );
}
