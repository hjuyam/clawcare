import { PageShell } from "@/app/_components/PageShell";

export default function MemoryPage() {
  return (
    <PageShell title="Memory" subtitle="把结果沉淀成长期记忆：可搜索、可整理、也可随时清理或导出。">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
        <p>占位：今日/昨日/近 7 天浏览、搜索、Pin/Delete/保留策略（敏感脱敏）。</p>
      </div>
    </PageShell>
  );
}
