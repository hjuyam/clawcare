import Link from "next/link";
import { PageShell } from "@/app/_components/PageShell";
import { CreateRunCard } from "@/app/ops/_components/CreateRunCard";

export default function OpsPage() {
  return (
    <PageShell
      title="Ops"
      subtitle="遇到异常先别慌：一键体检、生成诊断报告；需要时再执行修复动作（M2 起统一走 Runs）。"
    >
      <div className="space-y-4">
        <CreateRunCard />

        <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
          <div className="font-medium">运行历史</div>
          <div className="mt-2">
            去 <Link className="underline" href="/tasks">Tasks & Runs</Link> 查看。
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
          <div className="font-medium">说明</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              当前执行器是 mock（best-effort timer）。M2 目标是把可追踪闭环跑通。
            </li>
            <li>
              高危动作：restart_gateway / cleanup / diagnostics_bundle，会被 RBAC +
              Safe Mode 阻断。
            </li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
