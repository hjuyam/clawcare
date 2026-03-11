import { PageShell } from "@/app/_components/PageShell";

export default async function HomePage() {
  const res = await fetch("http://localhost:3000/api/capabilities", {
    cache: "no-store",
  }).catch(() => null);

  const data = res && res.ok ? await res.json() : null;

  return (
    <PageShell
      title="Home"
      subtitle="从这里开始：先确认环境正常，再逐步开启高级能力。"
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="text-sm font-medium">30 秒见价值路径</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-700">
            <li>打开面板（默认 localhost）→ 自动连接检测</li>
            <li>用人话告诉你：现在状态如何/下一步怎么做</li>
            <li>失败时给 1-3 步可操作修复 + 一键导出诊断信息</li>
          </ol>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Capabilities</div>
              <div className="text-xs text-neutral-500">GET /api/capabilities</div>
            </div>
            <div
              className={
                data
                  ? "rounded-full bg-emerald-50 px-2 py-1 text-xs text-emerald-700"
                  : "rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-700"
              }
            >
              {data ? "ok" : "unavailable"}
            </div>
          </div>

          <pre className="mt-3 overflow-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-100">
            {JSON.stringify(
              data ?? {
                ok: false,
                hint: "capabilities unavailable (dev stub)",
              },
              null,
              2
            )}
          </pre>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="text-sm font-medium">下一步（P0）</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
            <li>接入 BFF：鉴权/脱敏/审计/SSE 中继/策略护栏</li>
            <li>Config：备份 → diff 预览 → apply → 可回滚 → 自动自检</li>
            <li>Ops：self_check / restart / cleanup(dry-run 默认) / diagnostics bundle</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}
