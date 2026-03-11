import { PageShell } from "@/app/_components/PageShell";

export default function ConfigPage() {
  return (
    <PageShell title="Config" subtitle="改之前会自动备份，改之后可对比 diff 并随时回滚。">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
        <p>占位：Basic Settings + Config Center（只读→启用编辑→diff→apply→rollback）。</p>
      </div>
    </PageShell>
  );
}
