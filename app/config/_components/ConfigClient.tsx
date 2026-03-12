"use client";

import { useEffect, useMemo, useState } from "react";

type CurrentResp = {
  current_version: string;
  etag: string;
  config: Record<string, unknown>;
};

type PreviewResp = {
  current_version: string;
  base_version: string;
  diff: any;
  masked_current: any;
  masked_next: any;
};

export function ConfigClient() {
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<CurrentResp | null>(null);
  const [draftText, setDraftText] = useState("{}");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function loadCurrent() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/config/current", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setMsg({ ok: false, text: json?.error?.message || `HTTP ${res.status}` });
        return;
      }
      setCurrent(json);
      setDraftText(JSON.stringify(json.config ?? {}, null, 2));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCurrent();
  }, []);

  const draftJson = useMemo(() => {
    try {
      return JSON.parse(draftText) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [draftText]);

  async function doPreview() {
    setBusy("preview");
    setMsg(null);
    try {
      if (!draftJson) {
        setMsg({ ok: false, text: "Draft JSON is invalid." });
        return;
      }
      const res = await fetch("/api/config/preview_diff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          config: draftJson,
          base_version: current?.current_version,
        }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setMsg({ ok: false, text: json?.error?.message || `HTTP ${res.status}` });
        return;
      }
      setPreview(json);
      setMsg({ ok: true, text: "Preview generated." });
    } finally {
      setBusy(null);
    }
  }

  async function doApply() {
    setBusy("apply");
    setMsg(null);
    try {
      if (!draftJson) {
        setMsg({ ok: false, text: "Draft JSON is invalid." });
        return;
      }
      const res = await fetch("/api/config/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          config: draftJson,
          base_version: current?.current_version,
          reason: reason.trim() || "(no reason)",
          confirm: true,
        }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setMsg({ ok: false, text: json?.error?.message || `HTTP ${res.status}` });
        return;
      }
      setMsg({ ok: true, text: `Apply queued (run_id=${json?.run_id ?? ""})` });
    } finally {
      setBusy(null);
    }
  }

  async function doRollback() {
    setBusy("rollback");
    setMsg(null);
    try {
      if (!current?.current_version) {
        setMsg({ ok: false, text: "Current version missing." });
        return;
      }
      // Minimal UX: roll back to previous manifest version.
      const versionsRes = await fetch("/api/config/versions", {
        cache: "no-store",
      });
      const versionsJson = (await versionsRes.json().catch(() => null)) as any;
      if (!versionsRes.ok) {
        setMsg({
          ok: false,
          text: versionsJson?.error?.message || `HTTP ${versionsRes.status}`,
        });
        return;
      }
      const entries = (versionsJson?.entries ?? []) as Array<{ version: string }>;
      const idx = entries.findIndex((e) => e.version === current.current_version);
      const target = idx > 0 ? entries[idx - 1]?.version : null;
      if (!target) {
        setMsg({ ok: false, text: "No previous version to roll back to." });
        return;
      }

      const res = await fetch("/api/config/rollback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target_version: target,
          reason: reason.trim() || "(no reason)",
          confirm: true,
        }),
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setMsg({ ok: false, text: json?.error?.message || `HTTP ${res.status}` });
        return;
      }
      setMsg({ ok: true, text: `Rollback queued (run_id=${json?.run_id ?? ""})` });
    } finally {
      setBusy(null);
    }
  }

  const disabled = loading || !current;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-neutral-900">Current</div>
            <div className="mt-1 text-xs text-neutral-600">
              version: <span className="font-mono">{current?.current_version ?? "-"}</span> · etag:{" "}
              <span className="font-mono">{current?.etag?.slice(0, 10) ?? "-"}…</span>
            </div>
          </div>
          <button
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 disabled:opacity-50"
            disabled={loading}
            onClick={() => void loadCurrent()}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-2 text-sm font-medium text-neutral-900">Draft JSON</div>
        <textarea
          className="h-64 w-full rounded-lg border border-neutral-200 bg-white p-3 font-mono text-xs"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          spellCheck={false}
        />
        <div className="mt-2 text-xs text-neutral-600">
          {draftJson ? "JSON ok" : "JSON invalid"}
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5 text-sm">
        <div className="mb-2 text-sm font-medium text-neutral-900">Reason</div>
        <input
          className="w-full rounded-md border border-neutral-200 bg-white px-2 py-2 text-sm"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why are you changing config?"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={disabled || busy !== null}
            onClick={() => void doPreview()}
          >
            {busy === "preview" ? "Previewing…" : "Preview diff"}
          </button>
          <button
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={disabled || busy !== null}
            onClick={() => void doApply()}
          >
            {busy === "apply" ? "Applying…" : "Apply (confirm=true)"}
          </button>
          <button
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
            disabled={disabled || busy !== null}
            onClick={() => void doRollback()}
          >
            {busy === "rollback" ? "Rolling back…" : "Rollback to previous"}
          </button>

          {msg ? (
            <div className={`text-xs ${msg.ok ? "text-green-700" : "text-red-700"}`}>
              {msg.text}
            </div>
          ) : null}
        </div>

        <div className="mt-3 text-xs text-neutral-600">
          注意：Apply/Rollback 属于高危操作，会被 RBAC + Safe Mode 拦截；目前后端是 mock run。
        </div>
      </div>

      {preview ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-2 text-sm font-medium text-neutral-900">Preview (masked)</div>
          <pre className="overflow-auto rounded-lg bg-neutral-50 p-4 text-xs">
            {JSON.stringify(
              {
                base_version: preview.base_version,
                current_version: preview.current_version,
                diff: preview.diff,
              },
              null,
              2,
            )}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
