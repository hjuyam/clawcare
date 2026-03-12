import Link from "next/link";
import { PageShell } from "@/app/_components/PageShell";
import { ConfigClient } from "@/app/config/_components/ConfigClient";

export default function ConfigPage() {
  return (
    <PageShell title="Config" subtitle="备份→diff→apply/rollback（高危操作受 Safe Mode 约束）。">
      <div className="space-y-4">
        <ConfigClient />

        <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
          <div className="font-medium">运行历史</div>
          <div className="mt-2">
            Config apply/rollback 会创建 run。去 <Link className="underline" href="/tasks">Tasks & Runs</Link> 查看。
          </div>
        </div>
      </div>
    </PageShell>
  );
}
