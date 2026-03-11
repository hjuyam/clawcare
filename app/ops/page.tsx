import { PageShell } from "@/app/_components/PageShell";

export default function OpsPage() {
  return (
    <PageShell title="Ops" subtitle="遇到异常先别慌：一键体检、生成诊断报告，需要时再执行修复动作。">
      <div className="space-y-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
          <div className="font-medium">P0 动作（占位）</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>self_check</li>
            <li>restart_gateway（高危：二次确认 + reason）</li>
            <li>cleanup（默认 dry-run → 预览 → 确认执行）</li>
            <li>diagnostics bundle（脱敏）</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
