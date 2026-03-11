import { PageShell } from "@/app/_components/PageShell";

export default function TasksPage() {
  return (
    <PageShell title="Tasks & Runs" subtitle="统一 Runs/Tasks 入口 + 运行历史 + 单次运行详情。">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
        <p>占位：提交 run、查看列表/详情、SSE 事件流、stop run。</p>
      </div>
    </PageShell>
  );
}
