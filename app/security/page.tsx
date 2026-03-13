import { PageShell } from "@/app/_components/PageShell";
import { AuditLogClient } from "@/app/security/_components/AuditLogClient";

export default function SecurityPage() {
  return (
    <PageShell
      title="Security & Audit"
      subtitle="默认更安全：开启必要防护后，再考虑远程访问与外发能力。"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
          <div className="font-medium">P0 基线（只读）</div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>TOTP 登录 + HttpOnly session</li>
            <li>RBAC：Admin/Operator/Viewer</li>
            <li>高危操作二次确认 + 强制 reason（入审计）</li>
            <li>Safe Mode：只读 + 禁外发 + 禁改配置</li>
            <li>审计日志：login/config_change/tool_call/external_send</li>
          </ul>
        </div>

        <AuditLogClient />
      </div>
    </PageShell>
  );
}
