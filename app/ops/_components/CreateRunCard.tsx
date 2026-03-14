"use client";

import { useState } from "react";

const RUN_TYPES = [
  { type: "ops.self_check", risk: "low" },
  { type: "ops.restart_gateway", risk: "high" },
  { type: "ops.cleanup", risk: "high" },
  { type: "ops.diagnostics_bundle", risk: "high" },
] as const;

export function CreateRunCard() {
  const [type, setType] = useState<(typeof RUN_TYPES)[number]["type"]>(
    "ops.self_check",
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, reason: reason.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({
          ok: false,
          message: json?.error?.message || json?.message || `HTTP ${res.status}`,
        });
        return;
      }
      setReason("");
      setResult({ ok: true, message: `Run created: ${json?.run?.id ?? ""}` });
    } finally {
      setBusy(false);
    }
  }

  const risk = RUN_TYPES.find((r) => r.type === type)?.risk;

  return (
    <div
      className="rounded-xl border border-neutral-200 bg-white p-5"
      data-testid="create-run-card"
    >
      <div className="mb-2 text-sm font-medium text-neutral-900">创建 Run</div>
      <div className="text-xs text-neutral-600">
        M2 最小闭环：先用 mock executor 跑通“可追踪的运维动作”。高危动作仍受
        RBAC + Safe Mode 约束。
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs text-neutral-700">Type</span>
          <select
            className="rounded-md border border-neutral-200 bg-white px-2 py-2 text-sm"
            data-testid="create-run-type"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
          >
            {RUN_TYPES.map((r) => (
              <option key={r.type} value={r.type}>
                {r.type} {r.risk === "high" ? "(high risk)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs text-neutral-700">
            Reason {risk === "high" ? "(建议必填)" : "(optional)"}
          </span>
          <input
            className="rounded-md border border-neutral-200 bg-white px-2 py-2 text-sm"
            data-testid="create-run-reason"
            placeholder={risk === "high" ? "为什么要执行？" : ""}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            data-testid="create-run-submit"
            disabled={busy}
            onClick={submit}
          >
            {busy ? "提交中…" : "创建"}
          </button>
          {result ? (
            <div
              className={`text-xs ${result.ok ? "text-green-700" : "text-red-700"}`}
              data-testid="create-run-result"
            >
              {result.message}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
