"use client";

import { useState } from "react";

export default function LoginPage() {
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          otp,
          user_id: userId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus(data?.error?.message || "Login failed");
        return;
      }

      setStatus("登录成功，已写入 session cookie");
    } catch (err: any) {
      setStatus(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: "2rem", maxWidth: 420 }}>
      <h1>ClawCare 登录</h1>
      <p>请输入 TOTP（如需 DEV_BYPASS，请输入 DEV-BYPASS）</p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          用户 ID（可选）
          <input
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="local-admin"
            style={{ padding: "0.5rem" }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          TOTP
          <input
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="123456"
            style={{ padding: "0.5rem" }}
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
      {status ? <p style={{ marginTop: "1rem" }}>{status}</p> : null}
    </main>
  );
}
